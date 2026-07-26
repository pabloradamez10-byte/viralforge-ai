import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { v4 as uuid } from 'uuid';

export type SmartClipStatus = 'PENDING' | 'ANALYZING' | 'CUTTING' | 'COMPLETED' | 'FAILED';

export interface SmartClipItem {
  id: string;
  order: number;
  startSec: number;
  durationSec: number;
  filename: string;
  downloadUrl: string;
}

export interface SmartClipJob {
  id: string;
  userId: string;
  status: SmartClipStatus;
  progress: number;
  message: string;
  originalFilename: string;
  sourceDurationSec?: number;
  clips: SmartClipItem[];
  error?: string;
  createdAt: string;
  completedAt?: string;
}

interface InternalSmartClipJob extends SmartClipJob {
  clipFiles: Map<string, string>;
}

export class SmartClipsService {
  private readonly jobs = new Map<string, InternalSmartClipJob>();

  async create(
    userId: string,
    file: Buffer,
    originalFilename: string,
    requestedClips = 3,
    requestedDurationSec = 30,
  ): Promise<SmartClipJob> {
    if (!file.length) throw new Error('O vídeo enviado está vazio.');

    const id = uuid();
    const safeFilename = this.safeFilename(originalFilename || 'video.mp4');
    const job: InternalSmartClipJob = {
      id,
      userId,
      status: 'PENDING',
      progress: 0,
      message: 'Upload recebido. Preparando análise...',
      originalFilename: safeFilename,
      clips: [],
      clipFiles: new Map(),
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(id, job);
    void this.process(id, file, safeFilename, requestedClips, requestedDurationSec);
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

  private async process(
    id: string,
    file: Buffer,
    filename: string,
    requestedClips: number,
    requestedDurationSec: number,
  ): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;

    const workDirectory = path.resolve(process.cwd(), 'storage', 'smart-clips', id);
    const sourcePath = path.join(workDirectory, filename);

    try {
      await mkdir(workDirectory, { recursive: true });
      await writeFile(sourcePath, file);

      this.update(id, { status: 'ANALYZING', progress: 15, message: 'Analisando duração e formato do vídeo...' });
      const sourceDurationSec = await this.probeDuration(sourcePath);
      if (sourceDurationSec < 8) throw new Error('O vídeo precisa ter pelo menos 8 segundos.');

      const clipCount = Math.min(Math.max(Math.round(requestedClips), 1), 10);
      const clipDurationSec = Math.min(
        Math.max(Math.round(requestedDurationSec), 10),
        Math.min(60, Math.max(10, Math.floor(sourceDurationSec))),
      );
      const starts = this.calculateStarts(sourceDurationSec, clipDurationSec, clipCount);

      this.update(id, {
        status: 'CUTTING',
        progress: 25,
        message: `Criando ${starts.length} cortes verticais de teste...`,
        sourceDurationSec,
      });

      const clips: SmartClipItem[] = [];
      for (let index = 0; index < starts.length; index += 1) {
        const clipId = uuid();
        const outputFilename = `clip-${index + 1}.mp4`;
        const outputPath = path.join(workDirectory, outputFilename);
        const duration = Math.min(clipDurationSec, sourceDurationSec - starts[index]);

        await this.cutVerticalClip(sourcePath, outputPath, starts[index], duration);
        job.clipFiles.set(clipId, outputPath);
        clips.push({
          id: clipId,
          order: index + 1,
          startSec: Math.round(starts[index] * 10) / 10,
          durationSec: Math.round(duration * 10) / 10,
          filename: outputFilename,
          downloadUrl: `/api/v1/smart-clips/${id}/clips/${clipId}/download`,
        });

        this.update(id, {
          progress: 25 + Math.round(((index + 1) / starts.length) * 70),
          message: `Corte ${index + 1} de ${starts.length} concluído.`,
          clips: [...clips],
        });
      }

      this.update(id, {
        status: 'COMPLETED',
        progress: 100,
        message: 'Cortes prontos para baixar. Nesta primeira versão, usamos o áudio original.',
        clips,
        completedAt: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Falha ao processar o vídeo.';
      console.error('❌ SMART CLIPS ERROR', { id, message, error });
      this.update(id, {
        status: 'FAILED',
        progress: 100,
        message: 'Falha ao criar os cortes.',
        error: message,
        completedAt: new Date().toISOString(),
      });
    }
  }

  private calculateStarts(total: number, clipDuration: number, count: number): number[] {
    if (total <= clipDuration) return [0];
    const maxStart = Math.max(0, total - clipDuration);
    if (count === 1) return [maxStart / 2];
    return Array.from({ length: count }, (_, index) => (maxStart * index) / (count - 1));
  }

  private async probeDuration(filePath: string): Promise<number> {
    const output = await this.run('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath,
    ]);
    const duration = Number(output.trim());
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('Não foi possível ler a duração do vídeo.');
    return duration;
  }

  private async cutVerticalClip(input: string, output: string, start: number, duration: number): Promise<void> {
    await this.run('ffmpeg', [
      '-y', '-ss', start.toFixed(3), '-i', input, '-t', duration.toFixed(3),
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', output,
    ]);
  }

  private run(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve(stdout);
        else reject(new Error(`${command} terminou com código ${code}: ${stderr.slice(-1200)}`));
      });
    });
  }

  private update(id: string, patch: Partial<InternalSmartClipJob>): void {
    const current = this.jobs.get(id);
    if (current) Object.assign(current, patch);
  }

  private publicJob(job: InternalSmartClipJob): SmartClipJob {
    const { clipFiles: _clipFiles, userId: _userId, ...result } = job;
    return { ...result, userId: job.userId };
  }

  private safeFilename(value: string): string {
    const extension = path.extname(value).toLowerCase();
    const allowedExtension = ['.mp4', '.mov', '.m4v', '.webm'].includes(extension) ? extension : '.mp4';
    return `source${allowedExtension}`;
  }
}

export const smartClipsService = new SmartClipsService();
