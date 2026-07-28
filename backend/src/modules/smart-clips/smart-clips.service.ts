import { access, mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { v4 as uuid } from 'uuid';

import { aiService } from '../../services/ai/ai.service.js';
import { subtitleService } from '../video-render/subtitle.service.js';
import { ttsService, type TtsVoice } from '../video-render/tts.service.js';
import { transcriptionService, type TranscriptResult } from './transcription.service.js';

export type SmartClipStatus = 'PENDING' | 'ANALYZING' | 'TRANSCRIBING' | 'SELECTING' | 'GENERATING_AUDIO' | 'CUTTING' | 'COMPLETED' | 'FAILED';
export type SmartClipAudioMode = 'original' | 'rewrite' | 'custom';

export interface SmartClipOptions {
  clipCount: number;
  durationSec: number;
  audioMode: SmartClipAudioMode;
  customScript?: string;
  voice: TtsVoice;
  captions: boolean;
  removeSilence: boolean;
}

export interface SmartClipItem {
  id: string;
  order: number;
  startSec: number;
  durationSec: number;
  filename: string;
  downloadUrl: string;
  title: string;
  score: number;
  transcript: string;
  script?: string;
  audioMode: SmartClipAudioMode;
  qualityScore: number;
}

export interface SmartClipJob {
  id: string;
  userId: string;
  status: SmartClipStatus;
  progress: number;
  message: string;
  originalFilename: string;
  sourceDurationSec?: number;
  sourceHasAudio?: boolean;
  transcript?: string;
  clips: SmartClipItem[];
  options: SmartClipOptions;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

interface InternalSmartClipJob extends SmartClipJob { clipFiles: Map<string, string>; }
interface HighlightCandidate { startSec: number; endSec: number; title: string; score: number; transcript: string; suggestedScript?: string; }
interface AiHighlightsResponse {
  highlights?: Array<{ startSec?: number; endSec?: number; title?: string; score?: number; transcript?: string; suggestedScript?: string }>;
}
interface AiRewriteResponse { title?: string; script?: string; }
interface QualityAssessment { approved: boolean; score: number; reasons: string[]; }

const MIN_FINAL_DURATION_SEC = 12;
const MIN_HIGHLIGHT_SCORE = 60;
const MIN_QUALITY_SCORE = 68;
const MAX_REWRITE_ATTEMPTS = 3;
const FAREWELL_PATTERN = /\b(obrigad[oa]|muito obrigado|agradecer|agradeço|valeu|até mais|até a próxima|tchau|despedida|encerrando|finalizando|é isso|por tudo)\b/i;
const WEAK_FILLER_PATTERN = /\b(tipo assim|né|entendeu|beleza|enfim|bom pessoal|fala galera)\b/i;

export class SmartClipsService {
  private readonly jobs = new Map<string, InternalSmartClipJob>();

  async create(userId: string, file: Buffer, originalFilename: string, options: SmartClipOptions): Promise<SmartClipJob> {
    if (!file.length) throw new Error('O vídeo enviado está vazio.');
    const id = uuid();
    const safeFilename = this.safeFilename(originalFilename || 'video.mp4');
    const normalizedOptions = this.normalizeOptions(options);
    const job: InternalSmartClipJob = {
      id,
      userId,
      status: 'PENDING',
      progress: 0,
      message: 'Upload recebido. Preparando análise inteligente...',
      originalFilename: safeFilename,
      clips: [],
      clipFiles: new Map(),
      options: normalizedOptions,
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(id, job);
    void this.process(id, file, safeFilename, normalizedOptions);
    return this.publicJob(job);
  }

  get(userId: string, id: string): SmartClipJob {
    const job = this.jobs.get(id);
    if (!job || job.userId !== userId) throw new Error('Processamento não encontrado.');
    return this.publicJob(job);
  }

  async getClipFile(userId: string, jobId: string, clipId: string): Promise<string> {
    const job = this.jobs.get(jobId);
    if (!job || job.userId !== userId) throw new Error('Processamento não encontrado.');
    const filePath = job.clipFiles.get(clipId);
    if (!filePath) throw new Error('Corte não encontrado.');
    await access(filePath);
    return filePath;
  }

  private async process(id: string, file: Buffer, filename: string, options: SmartClipOptions): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;

    const workDirectory = path.resolve(process.cwd(), 'storage', 'smart-clips', id);
    const sourcePath = path.join(workDirectory, filename);

    try {
      await mkdir(workDirectory, { recursive: true });
      await writeFile(sourcePath, file);

      this.update(id, { status: 'ANALYZING', progress: 8, message: 'Analisando duração, vídeo e áudio utilizável...' });
      const sourceDurationSec = await this.probeDuration(sourcePath);
      if (sourceDurationSec < 8) throw new Error('O vídeo precisa ter pelo menos 8 segundos.');

      let transcript: TranscriptResult | undefined;
      let sourceHasAudio = false;

      if (options.audioMode === 'custom') {
        // Roteiro próprio não depende da faixa de áudio nem do Groq/Whisper.
        sourceHasAudio = await this.probeHasAudioStream(sourcePath);
        this.update(id, {
          sourceDurationSec,
          sourceHasAudio,
          message: 'Roteiro próprio detectado. Pulando transcrição e preparando as cenas...',
        });
        console.info('⏭️ SMART CLIPS TRANSCRIPTION SKIPPED', { id, mode: options.audioMode, sourceHasAudio });
      } else {
        this.update(id, { status: 'TRANSCRIBING', progress: 18, message: 'Extraindo e validando o áudio antes da transcrição...' });
        const transcriptionAudio = await this.extractValidatedAudio(sourcePath, workDirectory);
        sourceHasAudio = Boolean(transcriptionAudio);
        this.update(id, { sourceDurationSec, sourceHasAudio });

        if (!transcriptionAudio) {
          throw new Error(
            options.audioMode === 'rewrite'
              ? 'O arquivo não possui áudio utilizável para transcrever e reescrever. Use “Meu roteiro + voz”.'
              : 'O arquivo não possui áudio utilizável. Use “Meu roteiro + voz” ou envie um vídeo com fala audível.',
          );
        }

        this.update(id, { message: 'Áudio validado. Transcrevendo com timestamps...' });
        transcript = await transcriptionService.transcribe(transcriptionAudio);
        if (!transcript.text.trim() || transcript.segments.length === 0) {
          throw new Error('A transcrição não encontrou fala suficiente para criar cortes de qualidade.');
        }
        this.update(id, { transcript: transcript.text });
      }

      this.update(id, {
        status: 'SELECTING',
        progress: 34,
        message: transcript
          ? 'Selecionando e validando os melhores momentos...'
          : 'Distribuindo cenas para o roteiro próprio...',
      });

      const highlights = transcript
        ? await this.selectHighlights(transcript, sourceDurationSec, options)
        : this.customHighlights(sourceDurationSec, options);

      if (highlights.length === 0) {
        throw new Error('Nenhum trecho atingiu a qualidade mínima. Reduza a quantidade de cortes ou revise o roteiro.');
      }

      const clips: SmartClipItem[] = [];
      for (let index = 0; index < highlights.length; index += 1) {
        const highlight = highlights[index];
        if (!highlight) continue;

        const clipId = uuid();
        const outputFilename = `smart-clip-${index + 1}.mp4`;
        const outputPath = path.join(workDirectory, outputFilename);
        const rawVideoPath = path.join(workDirectory, `raw-${index + 1}.mp4`);
        const duration = Math.min(
          Math.max(highlight.endSec - highlight.startSec, MIN_FINAL_DURATION_SEC),
          sourceDurationSec - highlight.startSec,
        );

        this.update(id, {
          status: options.audioMode === 'original' ? 'CUTTING' : 'GENERATING_AUDIO',
          progress: 42 + Math.round((index / Math.max(highlights.length, 1)) * 48),
          message: `Produzindo e validando corte ${index + 1} de ${highlights.length}...`,
        });

        let script = this.resolveScript(highlight, options, index);
        if (options.audioMode === 'rewrite') {
          const rewritten = await this.generateQualityRewrite(highlight, options.durationSec);
          highlight.title = rewritten.title;
          script = rewritten.script;
        }
        if (options.audioMode === 'custom') {
          const customAssessment = this.assessTextQuality(script ?? '', options.durationSec, false);
          if (!customAssessment.approved) {
            throw new Error(`O roteiro do corte ${index + 1} foi reprovado: ${customAssessment.reasons.join(', ')}.`);
          }
          highlight.transcript = script ?? '';
          highlight.title = this.titleFromText(script ?? '', index);
        }

        await this.cutVerticalClip(
          sourcePath,
          rawVideoPath,
          highlight.startSec,
          duration,
          sourceHasAudio,
          options.removeSilence && options.audioMode === 'original',
        );

        if (options.audioMode === 'original') {
          const subtitleFile = options.captions && highlight.transcript
            ? await this.createSubtitle(workDirectory, index, highlight.transcript, duration)
            : undefined;
          await this.finishOriginalAudioClip(rawVideoPath, outputPath, subtitleFile);
        } else {
          if (!script) throw new Error('Não foi possível criar o roteiro da nova narração.');
          const narration = await ttsService.generateSpeech({
            text: script,
            voice: options.voice,
            outputDirectory: workDirectory,
            outputFilename: `voice-${index + 1}.mp3`,
            speed: 1.02,
          });
          const audioDuration = await this.probeDuration(narration.filePath);
          if (audioDuration < MIN_FINAL_DURATION_SEC) {
            throw new Error(`A narração do corte ${index + 1} ficou curta demais (${this.round(audioDuration)}s).`);
          }
          const subtitleFile = options.captions
            ? await this.createSubtitle(workDirectory, index, script, audioDuration)
            : undefined;
          await this.finishNarratedClip(rawVideoPath, outputPath, narration.filePath, subtitleFile, audioDuration);
        }

        const finalDuration = await this.probeDuration(outputPath);
        const quality = this.assessFinalClip(highlight, script, finalDuration, options, clips);
        console.info('🧪 SMART CLIP QUALITY GATE', {
          id,
          clip: index + 1,
          approved: quality.approved,
          score: quality.score,
          finalDuration: this.round(finalDuration),
          reasons: quality.reasons,
        });

        if (!quality.approved) {
          console.warn('🚫 SMART CLIP REJECTED', { id, clip: index + 1, reasons: quality.reasons });
          continue;
        }

        job.clipFiles.set(clipId, outputPath);
        clips.push({
          id: clipId,
          order: clips.length + 1,
          startSec: this.round(highlight.startSec),
          durationSec: this.round(finalDuration),
          filename: outputFilename,
          downloadUrl: `/api/v1/smart-clips/${id}/clips/${clipId}/download`,
          title: highlight.title,
          score: highlight.score,
          transcript: highlight.transcript,
          script: options.audioMode === 'original' ? undefined : script,
          audioMode: options.audioMode,
          qualityScore: quality.score,
        });
        this.update(id, { clips: [...clips] });
      }

      if (clips.length === 0) {
        throw new Error('Todos os cortes foram reprovados pelo controle de qualidade. Nenhum vídeo ruim foi entregue.');
      }

      this.update(id, {
        status: 'COMPLETED',
        progress: 100,
        message: `${clips.length} Smart Clip(s) aprovado(s) pelo controle de qualidade.`,
        clips,
        completedAt: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Falha ao processar o vídeo.';
      console.error('❌ SMART CLIPS ERROR', { id, message, error });
      this.update(id, {
        status: 'FAILED',
        progress: 100,
        message: 'Falha ao criar os Smart Clips.',
        error: message,
        completedAt: new Date().toISOString(),
      });
    }
  }

  private async extractValidatedAudio(sourcePath: string, workDirectory: string): Promise<string | undefined> {
    const audioPath = path.join(workDirectory, 'transcription-audio.wav');
    try {
      await this.run('ffmpeg', [
        '-y', '-i', sourcePath,
        '-map', '0:a:0', '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le',
        audioPath,
      ]);
      const info = await stat(audioPath);
      const duration = await this.probeDuration(audioPath);
      if (info.size < 32_000 || duration < 1) return undefined;
      console.info('🎙️ SMART CLIPS AUDIO VALIDATED', { duration: this.round(duration), bytes: info.size });
      return audioPath;
    } catch (error) {
      console.warn('🔇 SMART CLIPS AUDIO INVALID', { error: error instanceof Error ? error.message : error });
      return undefined;
    }
  }

  private async selectHighlights(transcript: TranscriptResult, sourceDuration: number, options: SmartClipOptions): Promise<HighlightCandidate[]> {
    const compactTranscript = transcript.segments.slice(0, 1000)
      .map((segment) => `[${this.round(segment.start)}-${this.round(segment.end)}] ${segment.text}`)
      .join('\n')
      .slice(0, 45_000);

    try {
      const range = this.targetWordRange(options.durationSec);
      const result = await aiService.safeJson<AiHighlightsResponse>([
        {
          role: 'system',
          content: 'Você é um editor rigoroso de Shorts, Reels e TikTok. Rejeite despedidas, agradecimentos, frases soltas, introduções vazias e trechos sem ideia completa. Responda somente JSON.',
        },
        {
          role: 'user',
          content: `Selecione exatamente ${options.clipCount} melhores trechos. Duração desejada: ${options.durationSec}s. Duração total: ${this.round(sourceDuration)}s. Não sobreponha trechos. Cada trecho deve conter gancho, desenvolvimento e conclusão. Nunca selecione apenas agradecimentos, despedidas ou encerramento. Dê score realista de 0-100. suggestedScript deve preservar o assunto e ter aproximadamente ${range.min}-${range.max} palavras, sem inventar fatos.\n\nTRANSCRIÇÃO:\n${compactTranscript}\n\nJSON: {"highlights":[{"startSec":0,"endSec":30,"title":"Título específico","score":85,"transcript":"fala original","suggestedScript":"roteiro otimizado"}]}`,
        },
      ], { temperature: 0.15, maxTokens: 5000 });

      const normalized = (result.highlights ?? []).map((item) => {
        const startSec = this.clamp(Number(item.startSec ?? 0), 0, Math.max(sourceDuration - 1, 0));
        const endSec = this.clamp(Number(item.endSec ?? 0), 1, sourceDuration);
        return {
          startSec,
          endSec,
          title: String(item.title ?? 'Momento em destaque').trim().slice(0, 100),
          score: this.clamp(Math.round(Number(item.score ?? 0)), 0, 100),
          transcript: this.transcriptForRange(transcript, startSec, endSec),
          suggestedScript: String(item.suggestedScript ?? '').replace(/\s+/g, ' ').trim(),
        };
      }).filter((item) => item.endSec - item.startSec >= MIN_FINAL_DURATION_SEC);

      const accepted = this.filterAndRankCandidates(normalized, options);
      if (accepted.length > 0) return accepted;
    } catch (error) {
      console.warn('⚠️ SMART CLIPS AI SELECTION FALLBACK', { error: error instanceof Error ? error.message : error });
    }

    return this.segmentHighlights(transcript, sourceDuration, options);
  }

  private filterAndRankCandidates(candidates: HighlightCandidate[], options: SmartClipOptions): HighlightCandidate[] {
    const accepted: HighlightCandidate[] = [];
    const ranked = candidates
      .map((candidate) => ({
        ...candidate,
        score: Math.round(candidate.score * 0.45 + this.heuristicScore(candidate.transcript) * 0.55),
      }))
      .filter((candidate) => candidate.score >= MIN_HIGHLIGHT_SCORE)
      .filter((candidate) => this.assessTextQuality(candidate.transcript, options.durationSec, true).approved)
      .sort((a, b) => b.score - a.score);

    for (const candidate of ranked) {
      const overlaps = accepted.some((item) => Math.max(item.startSec, candidate.startSec) < Math.min(item.endSec, candidate.endSec) - 2);
      const duplicate = accepted.some((item) => this.textSimilarity(item.transcript, candidate.transcript) >= 0.55);
      if (!overlaps && !duplicate) accepted.push(candidate);
      if (accepted.length >= options.clipCount) break;
    }
    return accepted.sort((a, b) => a.startSec - b.startSec);
  }

  private segmentHighlights(transcript: TranscriptResult, sourceDuration: number, options: SmartClipOptions): HighlightCandidate[] {
    const candidates = transcript.segments.map((segment) => {
      const startSec = segment.start;
      const endSec = Math.min(sourceDuration, startSec + options.durationSec);
      const text = this.transcriptForRange(transcript, startSec, endSec);
      return {
        startSec,
        endSec,
        title: this.titleFromText(text, 0),
        score: this.heuristicScore(text),
        transcript: text,
        suggestedScript: text,
      };
    });
    return this.filterAndRankCandidates(candidates, options);
  }

  private customHighlights(sourceDuration: number, options: SmartClipOptions): HighlightCandidate[] {
    const scripts = this.customScriptParts(options.customScript ?? '');
    const count = Math.min(options.clipCount, Math.max(1, scripts.length));
    const duration = Math.min(options.durationSec, sourceDuration);
    const maxStart = Math.max(0, sourceDuration - duration);

    return Array.from({ length: count }, (_, index) => {
      const startSec = count === 1 ? maxStart / 2 : (maxStart * index) / (count - 1);
      const script = scripts[index] ?? scripts[0] ?? '';
      return {
        startSec,
        endSec: Math.min(sourceDuration, startSec + duration),
        title: this.titleFromText(script, index),
        score: 85,
        transcript: script,
        suggestedScript: script,
      };
    });
  }

  private async generateQualityRewrite(highlight: HighlightCandidate, durationSec: number): Promise<{ title: string; script: string }> {
    const range = this.targetWordRange(durationSec);
    let lastReasons: string[] = [];

    for (let attempt = 1; attempt <= MAX_REWRITE_ATTEMPTS; attempt += 1) {
      const result = await aiService.safeJson<AiRewriteResponse>([
        {
          role: 'system',
          content: 'Você transforma uma fala real em um roteiro curto, fiel e envolvente. Não invente fatos. Não escreva despedidas ou agradecimentos. Responda somente JSON.',
        },
        {
          role: 'user',
          content: `Crie um roteiro de aproximadamente ${durationSec} segundos, entre ${range.min} e ${range.max} palavras. Precisa ter gancho específico, desenvolvimento claro e fechamento forte. Preserve estritamente o assunto.\n\nTRANSCRIÇÃO ORIGINAL:\n${highlight.transcript}\n\n${lastReasons.length ? `A tentativa anterior falhou por: ${lastReasons.join(', ')}.` : ''}\n\nJSON: {"title":"Título específico","script":"Roteiro completo"}`,
        },
      ], { temperature: attempt === 1 ? 0.35 : 0.2, maxTokens: 1200 });

      const script = String(result.script ?? '').replace(/\s+/g, ' ').trim();
      const title = String(result.title ?? highlight.title).replace(/\s+/g, ' ').trim().slice(0, 100);
      const assessment = this.assessTextQuality(script, durationSec, false);
      const fidelity = this.textSimilarity(script, highlight.transcript);
      if (assessment.approved && fidelity >= 0.12) return { title: title || highlight.title, script };

      lastReasons = [...assessment.reasons];
      if (fidelity < 0.12) lastReasons.push('roteiro perdeu o assunto da transcrição');
      console.warn('🔁 SMART CLIP SCRIPT RETRY', { attempt, reasons: lastReasons });
    }

    throw new Error(`A IA não conseguiu criar um roteiro com qualidade: ${lastReasons.join(', ')}.`);
  }

  private resolveScript(highlight: HighlightCandidate, options: SmartClipOptions, index: number): string | undefined {
    if (options.audioMode === 'original') return undefined;
    if (options.audioMode === 'custom') {
      const scripts = this.customScriptParts(options.customScript ?? '');
      return scripts[index] ?? scripts[0];
    }
    return highlight.suggestedScript || highlight.transcript;
  }

  private customScriptParts(value: string): string[] {
    return value
      .split(/\n\s*---+\s*\n|\n\s*CORTE\s*\d+\s*:?\s*/i)
      .map((part) => part.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  private assessFinalClip(highlight: HighlightCandidate, script: string | undefined, finalDuration: number, options: SmartClipOptions, existing: SmartClipItem[]): QualityAssessment {
    const reasons: string[] = [];
    const text = options.audioMode === 'original' ? highlight.transcript : script ?? '';
    const textAssessment = this.assessTextQuality(text, options.durationSec, options.audioMode === 'original');
    reasons.push(...textAssessment.reasons);
    if (finalDuration < MIN_FINAL_DURATION_SEC) reasons.push(`vídeo final com apenas ${this.round(finalDuration)}s`);
    if (finalDuration < Math.min(options.durationSec * 0.55, MIN_FINAL_DURATION_SEC)) reasons.push('duração muito abaixo da solicitada');
    if (existing.some((clip) => this.textSimilarity(clip.script || clip.transcript, text) >= 0.55)) reasons.push('conteúdo repetido em relação a outro corte');
    const durationScore = this.clamp(Math.round((finalDuration / Math.max(options.durationSec, MIN_FINAL_DURATION_SEC)) * 100), 0, 100);
    const score = Math.round(textAssessment.score * 0.75 + durationScore * 0.25);
    return { approved: score >= MIN_QUALITY_SCORE && reasons.length === 0, score, reasons };
  }

  private assessTextQuality(text: string, durationSec: number, originalAudio: boolean): QualityAssessment {
    const normalized = text.replace(/\s+/g, ' ').trim();
    const words = normalized.split(/\s+/).filter(Boolean).length;
    const range = this.targetWordRange(durationSec);
    const reasons: string[] = [];
    if (!normalized) reasons.push('texto vazio');
    if (FAREWELL_PATTERN.test(normalized)) reasons.push('trecho de despedida ou agradecimento');
    if (WEAK_FILLER_PATTERN.test(normalized) && words < range.min) reasons.push('fala de preenchimento sem conteúdo suficiente');
    const minimumWords = originalAudio ? Math.max(18, Math.floor(range.min * 0.55)) : range.min;
    if (words < minimumWords) reasons.push(`texto curto demais: ${words} palavras`);
    if (!/[.!?]/.test(normalized) && words < 35) reasons.push('ideia incompleta');
    if (words >= 12 && this.uniqueWordRatio(normalized) < 0.42) reasons.push('texto repetitivo');
    let score = 100 - reasons.length * 22;
    if (/[?!]/.test(normalized.slice(0, 140))) score += 4;
    if (/\b(mas|porém|porque|então|resultado|problema|descobri|aconteceu|verdade)\b/i.test(normalized)) score += 5;
    return { approved: reasons.length === 0 && score >= MIN_QUALITY_SCORE, score: this.clamp(score, 0, 100), reasons };
  }

  private transcriptForRange(transcript: TranscriptResult, start: number, end: number): string {
    return transcript.segments
      .filter((segment) => segment.end > start && segment.start < end)
      .map((segment) => segment.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private targetWordRange(durationSec: number): { min: number; max: number } {
    return {
      min: Math.max(24, Math.floor(durationSec * 1.75)),
      max: Math.max(34, Math.ceil(durationSec * 2.65)),
    };
  }

  private uniqueWordRatio(text: string): number {
    const words = text.toLowerCase().replace(/[^a-zà-ú0-9\s]/gi, ' ').split(/\s+/).filter((word) => word.length > 2);
    return words.length ? new Set(words).size / words.length : 0;
  }

  private textSimilarity(first: string, second: string): number {
    const firstWords = new Set(first.toLowerCase().replace(/[^a-zà-ú0-9\s]/gi, ' ').split(/\s+/).filter((word) => word.length > 3));
    const secondWords = new Set(second.toLowerCase().replace(/[^a-zà-ú0-9\s]/gi, ' ').split(/\s+/).filter((word) => word.length > 3));
    if (!firstWords.size || !secondWords.size) return 0;
    let intersection = 0;
    for (const word of firstWords) if (secondWords.has(word)) intersection += 1;
    return intersection / new Set([...firstWords, ...secondWords]).size;
  }

  private titleFromText(text: string, index: number): string {
    const title = text.split(/[.!?]/)[0]?.trim().slice(0, 80);
    return title || `Corte ${index + 1}`;
  }

  private async createSubtitle(workDirectory: string, index: number, text: string, duration: number): Promise<string> {
    const segments = subtitleService.createShortSegmentsFromScenes([{ voiceover: text, durationSec: Math.max(duration, 1) }]);
    return subtitleService.createSrt({ workingDirectory: workDirectory, filename: `clip-${index + 1}.srt`, segments });
  }

  private async cutVerticalClip(input: string, output: string, start: number, duration: number, hasAudio: boolean, removeSilence: boolean): Promise<void> {
    const args = [
      '-y', '-ss', start.toFixed(3), '-i', input, '-t', duration.toFixed(3),
      '-vf', 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1',
    ];
    if (hasAudio) {
      const audioFilter = removeSilence ? ',silenceremove=start_periods=1:start_silence=0.25:start_threshold=-45dB:stop_periods=-1:stop_silence=0.35:stop_threshold=-45dB' : '';
      args.push('-af', `aresample=async=1${audioFilter}`);
    }
    args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '25', '-threads', '2');
    if (hasAudio) args.push('-c:a', 'aac', '-b:a', '128k');
    else args.push('-an');
    args.push('-movflags', '+faststart', output);
    await this.run('ffmpeg', args);
  }

  private async finishOriginalAudioClip(input: string, output: string, subtitleFile?: string): Promise<void> {
    if (!subtitleFile) {
      await this.run('ffmpeg', ['-y', '-i', input, '-c', 'copy', '-movflags', '+faststart', output]);
      return;
    }
    await this.run('ffmpeg', [
      '-y', '-i', input, '-vf', this.subtitleFilter(subtitleFile),
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '24', '-threads', '2',
      '-c:a', 'copy', '-movflags', '+faststart', output,
    ]);
  }

  private async finishNarratedClip(video: string, output: string, narration: string, subtitleFile: string | undefined, duration: number): Promise<void> {
    const args = ['-y', '-stream_loop', '-1', '-i', video, '-i', narration, '-t', duration.toFixed(3)];
    if (subtitleFile) args.push('-vf', this.subtitleFilter(subtitleFile));
    args.push(
      '-map', '0:v:0', '-map', '1:a:0',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '24', '-threads', '2',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', output,
    );
    await this.run('ffmpeg', args);
  }

  private subtitleFilter(filePath: string): string {
    const escaped = filePath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
    return `subtitles='${escaped}':force_style='FontName=Arial,FontSize=16,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=1,Alignment=2,MarginV=100'`;
  }

  private async probeDuration(filePath: string): Promise<number> {
    const output = await this.run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath]);
    const duration = Number(output.trim());
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('Não foi possível ler a duração do arquivo.');
    return duration;
  }

  private async probeHasAudioStream(filePath: string): Promise<boolean> {
    try {
      const output = await this.run('ffprobe', [
        '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=index',
        '-of', 'default=noprint_wrappers=1:nokey=1', filePath,
      ]);
      return output.trim().length > 0;
    } catch {
      return false;
    }
  }

  private run(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      let settled = false;
      child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      child.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk.toString()}`.slice(-6000); });
      child.on('error', (error) => { if (!settled) { settled = true; reject(error); } });
      child.on('close', (code, signal) => {
        if (settled) return;
        settled = true;
        if (code === 0) { resolve(stdout); return; }
        const termination = signal ? `sinal ${signal}` : `código ${String(code)}`;
        reject(new Error(`${command} terminou com ${termination}. ${stderr.slice(-2200)}`));
      });
    });
  }

  private heuristicScore(text: string): number {
    const normalized = text.toLowerCase();
    let score = 45;
    if (/[?!]/.test(text)) score += 12;
    if (/mas |porém|segredo|verdade|nunca|problema|erro|descobri|resultado|então/.test(normalized)) score += 15;
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words >= 35 && words <= 150) score += 18;
    if (text.length < 80) score -= 20;
    if (FAREWELL_PATTERN.test(text)) score -= 55;
    if (WEAK_FILLER_PATTERN.test(text)) score -= 12;
    return this.clamp(score, 0, 100);
  }

  private normalizeOptions(options: SmartClipOptions): SmartClipOptions {
    const audioMode: SmartClipAudioMode = ['original', 'rewrite', 'custom'].includes(options.audioMode) ? options.audioMode : 'original';
    if (audioMode === 'custom' && !options.customScript?.trim()) throw new Error('Envie um roteiro para usar o modo de roteiro próprio.');
    return {
      clipCount: this.clamp(Math.round(options.clipCount || 3), 1, 10),
      durationSec: this.clamp(Math.round(options.durationSec || 30), 10, 60),
      audioMode,
      customScript: options.customScript?.trim().slice(0, 10_000),
      voice: options.voice || 'onyx',
      captions: options.captions !== false,
      removeSilence: options.removeSilence !== false,
    };
  }

  private update(id: string, patch: Partial<InternalSmartClipJob>): void {
    const current = this.jobs.get(id);
    if (current) Object.assign(current, patch);
  }

  private publicJob(job: InternalSmartClipJob): SmartClipJob {
    const { clipFiles: _clipFiles, ...result } = job;
    return result;
  }

  private safeFilename(value: string): string {
    const extension = path.extname(value).toLowerCase();
    const allowedExtension = ['.mp4', '.mov', '.m4v', '.webm'].includes(extension) ? extension : '.mp4';
    return `source${allowedExtension}`;
  }

  private clamp(value: number, min: number, max: number): number { return Math.min(Math.max(value, min), max); }
  private round(value: number): number { return Math.round(value * 10) / 10; }
}

export const smartClipsService = new SmartClipsService();
