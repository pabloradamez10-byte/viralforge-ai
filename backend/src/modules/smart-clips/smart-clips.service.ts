import { access, mkdir, writeFile } from 'node:fs/promises';
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
}

export interface SmartClipJob {
  id: string;
  userId: string;
  status: SmartClipStatus;
  progress: number;
  message: string;
  originalFilename: string;
  sourceDurationSec?: number;
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

export class SmartClipsService {
  private readonly jobs = new Map<string, InternalSmartClipJob>();

  async create(userId: string, file: Buffer, originalFilename: string, options: SmartClipOptions): Promise<SmartClipJob> {
    if (!file.length) throw new Error('O vídeo enviado está vazio.');
    const id = uuid();
    const safeFilename = this.safeFilename(originalFilename || 'video.mp4');
    const normalizedOptions = this.normalizeOptions(options);
    const job: InternalSmartClipJob = {
      id, userId, status: 'PENDING', progress: 0,
      message: 'Upload recebido. Preparando análise inteligente...',
      originalFilename: safeFilename, clips: [], clipFiles: new Map(),
      options: normalizedOptions, createdAt: new Date().toISOString(),
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
      this.update(id, { status: 'ANALYZING', progress: 8, message: 'Analisando duração, formato e áudio...' });
      const sourceDurationSec = await this.probeDuration(sourcePath);
      if (sourceDurationSec < 8) throw new Error('O vídeo precisa ter pelo menos 8 segundos.');

      this.update(id, { status: 'TRANSCRIBING', progress: 18, message: 'Transcrevendo o vídeo com timestamps...', sourceDurationSec });
      let transcript: TranscriptResult | undefined;
      try {
        transcript = await transcriptionService.transcribe(sourcePath);
        this.update(id, { transcript: transcript.text });
      } catch (error) {
        if (options.audioMode !== 'original') throw error;
        console.warn('⚠️ SMART CLIPS TRANSCRIPTION FALLBACK', { id, error: error instanceof Error ? error.message : error });
      }

      this.update(id, {
        status: 'SELECTING', progress: 34,
        message: transcript ? 'Selecionando os melhores momentos pela fala e retenção...' : 'Distribuindo cortes porque a transcrição não ficou disponível...',
      });
      const highlights = transcript
        ? await this.selectHighlights(transcript, sourceDurationSec, options)
        : this.fallbackHighlights(sourceDurationSec, options);

      const clips: SmartClipItem[] = [];
      for (let index = 0; index < highlights.length; index += 1) {
        const highlight = highlights[index];
        if (!highlight) continue;
        const clipId = uuid();
        const outputFilename = `smart-clip-${index + 1}.mp4`;
        const outputPath = path.join(workDirectory, outputFilename);
        const rawVideoPath = path.join(workDirectory, `raw-${index + 1}.mp4`);
        const duration = Math.min(Math.max(highlight.endSec - highlight.startSec, 8), sourceDurationSec - highlight.startSec);
        this.update(id, {
          status: options.audioMode === 'original' ? 'CUTTING' : 'GENERATING_AUDIO',
          progress: 42 + Math.round((index / Math.max(highlights.length, 1)) * 48),
          message: `Produzindo corte ${index + 1} de ${highlights.length}...`,
        });

        const script = this.resolveScript(highlight, options, index);
        await this.cutVerticalClip(sourcePath, rawVideoPath, highlight.startSec, duration, options.removeSilence && options.audioMode === 'original');

        if (options.audioMode === 'original') {
          const subtitleFile = options.captions && highlight.transcript
            ? await this.createSubtitle(workDirectory, index, highlight.transcript, duration)
            : undefined;
          await this.finishOriginalAudioClip(rawVideoPath, outputPath, subtitleFile);
        } else {
          if (!script) throw new Error('Não foi possível criar o roteiro da nova narração.');
          const narration = await ttsService.generateSpeech({
            text: script, voice: options.voice, outputDirectory: workDirectory,
            outputFilename: `voice-${index + 1}.mp3`, speed: 1.05,
          });
          const audioDuration = await this.probeDuration(narration.filePath);
          const subtitleFile = options.captions ? await this.createSubtitle(workDirectory, index, script, audioDuration) : undefined;
          await this.finishNarratedClip(rawVideoPath, outputPath, narration.filePath, subtitleFile, audioDuration);
        }

        job.clipFiles.set(clipId, outputPath);
        clips.push({
          id: clipId, order: index + 1, startSec: this.round(highlight.startSec), durationSec: this.round(duration),
          filename: outputFilename, downloadUrl: `/api/v1/smart-clips/${id}/clips/${clipId}/download`,
          title: highlight.title, score: highlight.score, transcript: highlight.transcript,
          script: options.audioMode === 'original' ? undefined : script, audioMode: options.audioMode,
        });
        this.update(id, { clips: [...clips] });
      }

      this.update(id, { status: 'COMPLETED', progress: 100, message: 'Smart Clips concluídos com seleção inteligente, áudio e legendas.', clips, completedAt: new Date().toISOString() });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Falha ao processar o vídeo.';
      console.error('❌ SMART CLIPS ERROR', { id, message, error });
      this.update(id, { status: 'FAILED', progress: 100, message: 'Falha ao criar os Smart Clips.', error: message, completedAt: new Date().toISOString() });
    }
  }

  private async selectHighlights(transcript: TranscriptResult, sourceDuration: number, options: SmartClipOptions): Promise<HighlightCandidate[]> {
    const compactTranscript = transcript.segments.slice(0, 1000)
      .map((segment) => `[${this.round(segment.start)}-${this.round(segment.end)}] ${segment.text}`)
      .join('\n').slice(0, 45_000);
    try {
      const result = await aiService.safeJson<AiHighlightsResponse>([
        { role: 'system', content: 'Você é um editor profissional de Shorts, Reels e TikTok. Selecione momentos autossuficientes, com gancho, clareza, tensão, surpresa ou valor. Responda somente JSON.' },
        { role: 'user', content: `Selecione exatamente ${options.clipCount} melhores trechos. Duração desejada: ${options.durationSec}s. Duração total: ${this.round(sourceDuration)}s. Modo: ${options.audioMode}. Não sobreponha trechos. Comece e termine ideias completas. Dê score 0-100. suggestedScript deve reescrever a ideia em português natural, com gancho forte e sem inventar fatos.\n\nTRANSCRIÇÃO:\n${compactTranscript}\n\nJSON: {"highlights":[{"startSec":0,"endSec":30,"title":"Título curto","score":90,"transcript":"fala original","suggestedScript":"roteiro otimizado"}]}` },
      ], { temperature: 0.2, maxTokens: 5000 });
      const normalized = (result.highlights ?? []).map((item) => ({
        startSec: this.clamp(Number(item.startSec ?? 0), 0, sourceDuration - 1),
        endSec: this.clamp(Number(item.endSec ?? 0), 1, sourceDuration),
        title: String(item.title ?? 'Momento em destaque').trim().slice(0, 100),
        score: this.clamp(Math.round(Number(item.score ?? 70)), 0, 100),
        transcript: String(item.transcript ?? '').replace(/\s+/g, ' ').trim(),
        suggestedScript: String(item.suggestedScript ?? '').replace(/\s+/g, ' ').trim(),
      })).filter((item) => item.endSec - item.startSec >= 8).sort((a, b) => b.score - a.score);
      const accepted: HighlightCandidate[] = [];
      for (const candidate of normalized) {
        const overlaps = accepted.some((item) => Math.max(item.startSec, candidate.startSec) < Math.min(item.endSec, candidate.endSec) - 2);
        if (!overlaps) accepted.push(candidate);
        if (accepted.length >= options.clipCount) break;
      }
      if (accepted.length > 0) return accepted.sort((a, b) => a.startSec - b.startSec);
    } catch (error) {
      console.warn('⚠️ SMART CLIPS AI SELECTION FALLBACK', { error: error instanceof Error ? error.message : error });
    }
    return this.segmentHighlights(transcript, sourceDuration, options);
  }

  private segmentHighlights(transcript: TranscriptResult, sourceDuration: number, options: SmartClipOptions): HighlightCandidate[] {
    const candidates = transcript.segments.map((segment, index) => {
      const start = segment.start;
      const end = Math.min(sourceDuration, start + options.durationSec);
      const text = transcript.segments.slice(index).filter((item) => item.start < end).map((item) => item.text).join(' ').trim();
      return { startSec: start, endSec: end, title: text.split(/[.!?]/)[0]?.slice(0, 80) || 'Momento em destaque', score: this.heuristicScore(text), transcript: text, suggestedScript: text };
    });
    const selected: HighlightCandidate[] = [];
    for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
      if (selected.some((item) => Math.abs(item.startSec - candidate.startSec) < options.durationSec * 0.7)) continue;
      selected.push(candidate);
      if (selected.length >= options.clipCount) break;
    }
    return selected.sort((a, b) => a.startSec - b.startSec);
  }

  private fallbackHighlights(sourceDuration: number, options: SmartClipOptions): HighlightCandidate[] {
    const duration = Math.min(options.durationSec, sourceDuration);
    const maxStart = Math.max(0, sourceDuration - duration);
    const count = Math.min(options.clipCount, Math.max(1, Math.floor(sourceDuration / Math.max(duration, 1))));
    return Array.from({ length: count }, (_, index) => {
      const start = count === 1 ? maxStart / 2 : (maxStart * index) / (count - 1);
      return { startSec: start, endSec: Math.min(sourceDuration, start + duration), title: `Corte ${index + 1}`, score: 50, transcript: '' };
    });
  }

  private resolveScript(highlight: HighlightCandidate, options: SmartClipOptions, index: number): string | undefined {
    if (options.audioMode === 'original') return undefined;
    if (options.audioMode === 'custom') {
      const parts = (options.customScript ?? '').split(/\n\s*---+\s*\n|\n\s*CORTE\s*\d+\s*:?\s*/i).map((part) => part.trim()).filter(Boolean);
      return parts[index] ?? options.customScript?.trim();
    }
    return highlight.suggestedScript || highlight.transcript;
  }

  private async createSubtitle(workDirectory: string, index: number, text: string, duration: number): Promise<string> {
    const segments = subtitleService.createShortSegmentsFromScenes([{ voiceover: text, durationSec: Math.max(duration, 1) }]);
    return subtitleService.createSrt({ workingDirectory: workDirectory, filename: `clip-${index + 1}.srt`, segments });
  }

  private async cutVerticalClip(input: string, output: string, start: number, duration: number, removeSilence: boolean): Promise<void> {
    const audioFilter = removeSilence ? ',silenceremove=start_periods=1:start_silence=0.25:start_threshold=-45dB:stop_periods=-1:stop_silence=0.35:stop_threshold=-45dB' : '';
    await this.run('ffmpeg', [
      '-y', '-ss', start.toFixed(3), '-i', input, '-t', duration.toFixed(3),
      '-vf', 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1',
      '-af', `aresample=async=1${audioFilter}`,
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '25', '-threads', '2',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', output,
    ]);
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
      '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', output,
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

  private run(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      let settled = false;

      child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      child.stderr.on('data', (chunk) => {
        stderr = `${stderr}${chunk.toString()}`.slice(-6000);
      });
      child.on('error', (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      });
      child.on('close', (code, signal) => {
        if (settled) return;
        settled = true;
        if (code === 0) {
          resolve(stdout);
          return;
        }
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

  private update(id: string, patch: Partial<InternalSmartClipJob>): void { const current = this.jobs.get(id); if (current) Object.assign(current, patch); }
  private publicJob(job: InternalSmartClipJob): SmartClipJob { const { clipFiles: _clipFiles, ...result } = job; return result; }
  private safeFilename(value: string): string { const extension = path.extname(value).toLowerCase(); const allowedExtension = ['.mp4', '.mov', '.m4v', '.webm'].includes(extension) ? extension : '.mp4'; return `source${allowedExtension}`; }
  private clamp(value: number, min: number, max: number): number { return Math.min(Math.max(value, min), max); }
  private round(value: number): number { return Math.round(value * 10) / 10; }
}

export const smartClipsService = new SmartClipsService();
