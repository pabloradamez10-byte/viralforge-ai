import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuid } from 'uuid';

import { ffmpegService } from './ffmpeg.service.js';
import { mediaService } from './media.service.js';
import { subtitleService } from './subtitle.service.js';
import { ttsService } from './tts.service.js';

import type {
  CreateVideoRenderDto,
  VideoRenderResult,
} from './video-render.dto.js';

type RenderScene = CreateVideoRenderDto['scenes'][number];

interface InternalVideoRenderResult
  extends VideoRenderResult {
  userId: string;
  outputFile?: string;
}

export class VideoRenderService {
  private readonly jobs = new Map<
    string,
    InternalVideoRenderResult
  >();

  async render(
    userId: string,
    dto: CreateVideoRenderDto,
  ): Promise<VideoRenderResult> {
    const renderId = uuid();
    const createdAt = new Date().toISOString();

    const job: InternalVideoRenderResult = {
      id: renderId,
      userId,
      status: 'PENDING',
      progress: 0,
      message: 'Renderização iniciada.',
      createdAt,
    };

    this.jobs.set(renderId, job);

    /*
     * O processamento continua em segundo plano.
     * Assim a requisição HTTP não precisa ficar aberta
     * durante todo o tempo de renderização.
     */
    void this.processRender(
      renderId,
      userId,
      dto,
    );

    return this.toPublicResult(job);
  }

  async status(
    userId: string,
    id: string,
  ): Promise<VideoRenderResult> {
    const job = this.jobs.get(id);

    if (!job || job.userId !== userId) {
      throw new Error(
        'Renderização não encontrada.',
      );
    }

    return this.toPublicResult(job);
  }

  async getOutputFile(
    userId: string,
    id: string,
  ): Promise<string> {
    const job = this.jobs.get(id);

    if (!job || job.userId !== userId) {
      throw new Error(
        'Renderização não encontrada.',
      );
    }

    if (
      job.status !== 'COMPLETED' ||
      !job.outputFile
    ) {
      throw new Error(
        'O vídeo ainda não está disponível para download.',
      );
    }

    await access(job.outputFile);

    return job.outputFile;
  }

  private async processRender(
    renderId: string,
    userId: string,
    dto: CreateVideoRenderDto,
  ): Promise<void> {
    const workDirectory = path.resolve(
      process.cwd(),
      'storage',
      'work',
      renderId,
    );

    const renderDirectory = path.resolve(
      process.cwd(),
      'storage',
      'renders',
    );

    try {
      await mkdir(workDirectory, {
        recursive: true,
      });

      await mkdir(renderDirectory, {
        recursive: true,
      });

      this.updateJob(renderId, {
        status: 'GENERATING_AUDIO',
        progress: 10,
        message: 'Gerando narração...',
      });

      const narration = await ttsService.generateSpeech({
        text: dto.narration,
        voice: dto.voice,
        outputDirectory: workDirectory,
        outputFilename: 'narration.mp3',
      });

      const narrationDurationSec =
        await ffmpegService.probeDuration(
          narration.filePath,
        );

      const plannedScenes =
        this.alignScenesWithNarration(
          dto.scenes,
          narrationDurationSec,
        );

      this.updateJob(renderId, {
        status: 'SEARCHING_MEDIA',
        progress: 25,
        message:
          'Buscando vídeos para as cenas...',
      });

      const downloadedMedia =
        await mediaService.downloadMediaForScenes({
          scenes: plannedScenes.map((scene) => ({
            order: scene.order,
            name: scene.name,
            visual: scene.visual,
            voiceover: scene.voiceover,
            searchKeywords:
              scene.searchKeywords,
            durationSec:
              scene.durationSec,
          })),
          outputDirectory: path.join(
            workDirectory,
            'media',
          ),
        });

      this.updateJob(renderId, {
        status: 'DOWNLOADING_MEDIA',
        progress: 55,
        message:
          'Mídias das cenas baixadas.',
      });

      const orderedMedia = [
        ...downloadedMedia,
      ].sort(
        (first, second) =>
          first.order - second.order,
      );

      this.updateJob(renderId, {
        status: 'GENERATING_SUBTITLES',
        progress: 65,
        message: 'Gerando legendas...',
      });

      const subtitleSegments =
        subtitleService.createShortSegmentsFromScenes(
          plannedScenes
            .slice()
            .sort(
              (first, second) =>
                first.order - second.order,
            )
            .map((scene) => ({
              voiceover: scene.voiceover,
              durationSec:
                scene.durationSec,
            })),
        );

      const subtitleFile =
        await subtitleService.createSrt({
          workingDirectory:
            workDirectory,
          filename: 'subtitles.srt',
          segments: subtitleSegments,
        });

      this.updateJob(renderId, {
        status: 'RENDERING',
        progress: 75,
        message:
          'Montando o vídeo final...',
      });

      const dimensions =
        this.getDimensions(
          dto.format,
          dto.resolution,
        );

      const outputFilename =
        `${renderId}.mp4`;

      const temporaryOutput =
        await ffmpegService.render({
          workingDirectory:
            workDirectory,
          outputFilename,
          inputVideos: orderedMedia.map(
            (media) => media.filePath,
          ),
          sceneDurations:
            orderedMedia.map(
              (media) =>
                media.durationSec,
            ),
          narrationFile:
            narration.filePath,
          subtitleFile,
          width: dimensions.width,
          height: dimensions.height,
          fps: 30,
        });

      const finalOutputFile = path.join(
        renderDirectory,
        outputFilename,
      );

      /*
       * O FFmpeg gera inicialmente no diretório do job.
       * O arquivo final é movido para storage/renders.
       */
      const { rename } = await import(
        'node:fs/promises'
      );

      await rename(
        temporaryOutput.outputFile,
        finalOutputFile,
      );

      this.updateJob(renderId, {
        status: 'COMPLETED',
        progress: 100,
        message:
          'Vídeo gerado com sucesso.',
        outputFilename,
        outputFile: finalOutputFile,
        downloadUrl:
          `/api/v1/video-renders/${renderId}/download`,
        completedAt:
          new Date().toISOString(),
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Falha desconhecida durante a renderização.';

      console.error(
        '❌ VIDEO RENDER ERROR',
        {
          renderId,
          userId,
          message,
          error,
        },
      );

      this.updateJob(renderId, {
        status: 'FAILED',
        progress: 100,
        message:
          'Falha ao gerar o vídeo.',
        error: message,
        completedAt:
          new Date().toISOString(),
      });
    }
  }

  private alignScenesWithNarration(
    scenes: RenderScene[],
    narrationDurationSec: number,
  ): RenderScene[] {
    const orderedScenes = scenes
      .slice()
      .sort(
        (first, second) =>
          first.order - second.order,
      );

    if (
      orderedScenes.length === 0 ||
      !Number.isFinite(narrationDurationSec) ||
      narrationDurationSec <= 0
    ) {
      return orderedScenes;
    }

    const weights = orderedScenes.map((scene) => {
      const wordCount = scene.voiceover
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;

      return Math.max(
        wordCount,
        scene.durationSec,
        1,
      );
    });

    const totalWeight = weights.reduce(
      (total, weight) => total + weight,
      0,
    );

    let allocated = 0;

    return orderedScenes.map((scene, index) => {
      const isLastScene =
        index === orderedScenes.length - 1;

      const durationSec = isLastScene
        ? Math.max(
            narrationDurationSec - allocated,
            0.75,
          )
        : Math.max(
            (narrationDurationSec * (weights[index] ?? 1)) /
              totalWeight,
            0.75,
          );

      const roundedDuration =
        Math.round(durationSec * 100) / 100;

      allocated += roundedDuration;

      return {
        ...scene,
        durationSec: roundedDuration,
      };
    });
  }

  private getDimensions(
    format:
      | 'vertical'
      | 'horizontal'
      | 'square',
    resolution: '720p' | '1080p',
  ): {
    width: number;
    height: number;
  } {
    if (format === 'horizontal') {
      return resolution === '1080p'
        ? {
            width: 1920,
            height: 1080,
          }
        : {
            width: 1280,
            height: 720,
          };
    }

    if (format === 'square') {
      return resolution === '1080p'
        ? {
            width: 1080,
            height: 1080,
          }
        : {
            width: 720,
            height: 720,
          };
    }

    return resolution === '1080p'
      ? {
          width: 1080,
          height: 1920,
        }
      : {
          width: 720,
          height: 1280,
        };
  }

  private updateJob(
    id: string,
    changes: Partial<InternalVideoRenderResult>,
  ): void {
    const current = this.jobs.get(id);

    if (!current) {
      return;
    }

    this.jobs.set(id, {
      ...current,
      ...changes,
    });
  }

  private toPublicResult(
    job: InternalVideoRenderResult,
  ): VideoRenderResult {
    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      message: job.message,
      downloadUrl: job.downloadUrl,
      outputFilename:
        job.outputFilename,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }
}

export const videoRenderService =
  new VideoRenderService();
