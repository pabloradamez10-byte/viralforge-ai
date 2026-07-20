import { access, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuid } from 'uuid';

import { ffmpegService } from './ffmpeg.service.js';
import { mediaService, type DownloadedSceneMedia } from './media.service.js';
import { subtitleService } from './subtitle.service.js';
import { ttsService } from './tts.service.js';
import { visionReviewService } from './vision-review.service.js';

import type { CreateVideoRenderDto, VideoRenderResult } from './video-render.dto.js';

type RenderScene = CreateVideoRenderDto['scenes'][number];

interface InternalVideoRenderResult extends VideoRenderResult {
  userId: string;
  outputFile?: string;
}

export class VideoRenderService {
  private readonly jobs = new Map<string, InternalVideoRenderResult>();

  async render(userId: string, dto: CreateVideoRenderDto): Promise<VideoRenderResult> {
    const id = uuid();
    const job: InternalVideoRenderResult = {
      id,
      userId,
      status: 'PENDING',
      progress: 0,
      message: 'Renderização iniciada.',
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(id, job);
    void this.processRender(id, userId, dto);
    return this.toPublicResult(job);
  }

  async status(userId: string, id: string): Promise<VideoRenderResult> {
    const job = this.jobs.get(id);
    if (!job || job.userId !== userId) throw new Error('Renderização não encontrada.');
    return this.toPublicResult(job);
  }

  async getOutputFile(userId: string, id: string): Promise<string> {
    const job = this.jobs.get(id);
    if (!job || job.userId !== userId) throw new Error('Renderização não encontrada.');
    if (job.status !== 'COMPLETED' || !job.outputFile) {
      throw new Error('O vídeo ainda não está disponível para download.');
    }
    await access(job.outputFile);
    return job.outputFile;
  }

  private async processRender(
    renderId: string,
    userId: string,
    dto: CreateVideoRenderDto,
  ): Promise<void> {
    const workDirectory = path.resolve(process.cwd(), 'storage', 'work', renderId);
    const renderDirectory = path.resolve(process.cwd(), 'storage', 'renders');

    try {
      await mkdir(workDirectory, { recursive: true });
      await mkdir(renderDirectory, { recursive: true });

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

      const narrationDurationSec = await ffmpegService.probeDuration(narration.filePath);
      const plannedScenes = this.alignScenesWithNarration(dto.scenes, narrationDurationSec);

      this.updateJob(renderId, {
        status: 'SEARCHING_MEDIA',
        progress: 25,
        message: 'Buscando e avaliando vídeos para as cenas...',
      });

      const mediaDirectory = path.join(workDirectory, 'media');
      let downloadedMedia = await mediaService.downloadMediaForScenes({
        scenes: plannedScenes.map((scene) => ({
          order: scene.order,
          name: scene.name,
          visual: scene.visual,
          voiceover: scene.voiceover,
          searchKeywords: scene.searchKeywords,
          durationSec: scene.durationSec,
        })),
        outputDirectory: mediaDirectory,
      });

      downloadedMedia = await this.reviewAndRepairMedia(
        plannedScenes,
        downloadedMedia,
        workDirectory,
      );

      this.updateJob(renderId, {
        status: 'DOWNLOADING_MEDIA',
        progress: 55,
        message: 'Mídias avaliadas e aprovadas.',
      });

      const orderedMedia = [...downloadedMedia].sort((a, b) => a.order - b.order);

      this.updateJob(renderId, {
        status: 'GENERATING_SUBTITLES',
        progress: 65,
        message: 'Gerando legendas...',
      });

      const subtitleSegments = subtitleService.createShortSegmentsFromScenes(
        plannedScenes
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((scene) => ({
            voiceover: scene.voiceover,
            durationSec: scene.durationSec,
          })),
      );

      const subtitleFile = await subtitleService.createSrt({
        workingDirectory: workDirectory,
        filename: 'subtitles.srt',
        segments: subtitleSegments,
      });

      this.updateJob(renderId, {
        status: 'RENDERING',
        progress: 75,
        message: 'Montando o vídeo final...',
      });

      const dimensions = this.getDimensions(dto.format, dto.resolution);
      const outputFilename = `${renderId}.mp4`;
      const temporaryOutput = await ffmpegService.render({
        workingDirectory: workDirectory,
        outputFilename,
        inputVideos: orderedMedia.map((media) => media.filePath),
        sceneDurations: orderedMedia.map((media) => media.durationSec),
        narrationFile: narration.filePath,
        subtitleFile,
        width: dimensions.width,
        height: dimensions.height,
        fps: 30,
      });

      const finalOutputFile = path.join(renderDirectory, outputFilename);
      await rename(temporaryOutput.outputFile, finalOutputFile);

      this.updateJob(renderId, {
        status: 'COMPLETED',
        progress: 100,
        message: 'Vídeo gerado com revisão visual automática.',
        outputFilename,
        outputFile: finalOutputFile,
        downloadUrl: `/api/v1/video-renders/${renderId}/download`,
        completedAt: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : 'Falha desconhecida durante a renderização.';

      console.error('❌ VIDEO RENDER ERROR', { renderId, userId, message, error });
      this.updateJob(renderId, {
        status: 'FAILED',
        progress: 100,
        message: 'Falha ao gerar o vídeo.',
        error: message,
        completedAt: new Date().toISOString(),
      });
    }
  }

  private async reviewAndRepairMedia(
    scenes: RenderScene[],
    media: DownloadedSceneMedia[],
    workDirectory: string,
  ): Promise<DownloadedSceneMedia[]> {
    if (!visionReviewService.isEnabled()) {
      console.info('ℹ️ VISION REVIEW DISABLED: GEMINI_API_KEY not configured');
      return media;
    }

    const byOrder = new Map(media.map((item) => [item.order, item]));
    const failed: Array<{ scene: RenderScene; original: DownloadedSceneMedia; query?: string; score: number }> = [];

    for (const scene of scenes) {
      const item = byOrder.get(scene.order);
      if (!item) continue;

      try {
        const review = await visionReviewService.reviewScene({
          sceneOrder: scene.order,
          sceneName: scene.name,
          visual: scene.visual,
          voiceover: scene.voiceover,
          searchKeywords: scene.searchKeywords,
          videoFile: item.filePath,
          outputDirectory: path.join(workDirectory, 'vision-frames'),
        });

        console.info('👁️ VISION ASSESSMENT', {
          sceneOrder: scene.order,
          score: review.score,
          relevant: review.relevant,
          detectedContent: review.detectedContent,
          reasons: review.reasons,
        });

        if (!review.relevant) {
          failed.push({
            scene,
            original: item,
            query: review.recommendedSearchQuery,
            score: review.score,
          });
        }
      } catch (error: unknown) {
        console.warn('⚠️ VISION REVIEW FAILED; keeping heuristic selection', {
          sceneOrder: scene.order,
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    if (failed.length === 0) return media;

    const retryScenes = failed.map(({ scene, query }) => ({
      order: scene.order,
      name: scene.name,
      visual: scene.visual,
      voiceover: scene.voiceover,
      durationSec: scene.durationSec,
      searchKeywords: [
        ...(query ? [query] : []),
        ...(scene.searchKeywords ?? []),
      ].slice(0, 10),
    }));

    console.info('🔁 VISION AUTO-REPAIR', {
      scenes: retryScenes.map((scene) => scene.order),
    });

    const replacements = await mediaService.downloadMediaForScenes({
      scenes: retryScenes,
      outputDirectory: path.join(workDirectory, 'media-vision-retry'),
    });

    for (const replacement of replacements) {
      const failedScene = failed.find((entry) => entry.scene.order === replacement.order);
      if (!failedScene) continue;

      try {
        const review = await visionReviewService.reviewScene({
          sceneOrder: failedScene.scene.order,
          sceneName: failedScene.scene.name,
          visual: failedScene.scene.visual,
          voiceover: failedScene.scene.voiceover,
          searchKeywords: failedScene.scene.searchKeywords,
          videoFile: replacement.filePath,
          outputDirectory: path.join(workDirectory, 'vision-retry-frames'),
        });

        console.info('👁️ VISION RETRY ASSESSMENT', {
          sceneOrder: replacement.order,
          originalScore: failedScene.score,
          retryScore: review.score,
          accepted: review.relevant || review.score > failedScene.score,
        });

        if (review.relevant || review.score > failedScene.score) {
          byOrder.set(replacement.order, replacement);
        }
      } catch (error: unknown) {
        console.warn('⚠️ VISION RETRY REVIEW FAILED; keeping original media', {
          sceneOrder: replacement.order,
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    return [...byOrder.values()].sort((a, b) => a.order - b.order);
  }

  private alignScenesWithNarration(
    scenes: RenderScene[],
    narrationDurationSec: number,
  ): RenderScene[] {
    const orderedScenes = scenes.slice().sort((a, b) => a.order - b.order);
    if (orderedScenes.length === 0 || !Number.isFinite(narrationDurationSec) || narrationDurationSec <= 0) {
      return orderedScenes;
    }

    const weights = orderedScenes.map((scene) => Math.max(
      scene.voiceover.trim().split(/\s+/).filter(Boolean).length,
      1,
    ));
    const totalWeight = weights.reduce((total, weight) => total + weight, 0);
    let allocated = 0;

    return orderedScenes.map((scene, index) => {
      const isLast = index === orderedScenes.length - 1;
      const duration = isLast
        ? Math.max(narrationDurationSec - allocated, 0)
        : (narrationDurationSec * (weights[index] ?? 1)) / totalWeight;
      const rounded = Math.round(duration * 100) / 100;
      allocated += rounded;
      return { ...scene, durationSec: rounded };
    });
  }

  private getDimensions(
    format: 'vertical' | 'horizontal' | 'square',
    resolution: '720p' | '1080p',
  ): { width: number; height: number } {
    if (format === 'horizontal') {
      return resolution === '1080p'
        ? { width: 1920, height: 1080 }
        : { width: 1280, height: 720 };
    }
    if (format === 'square') {
      return resolution === '1080p'
        ? { width: 1080, height: 1080 }
        : { width: 720, height: 720 };
    }
    return resolution === '1080p'
      ? { width: 1080, height: 1920 }
      : { width: 720, height: 1280 };
  }

  private updateJob(id: string, changes: Partial<InternalVideoRenderResult>): void {
    const current = this.jobs.get(id);
    if (current) this.jobs.set(id, { ...current, ...changes });
  }

  private toPublicResult(job: InternalVideoRenderResult): VideoRenderResult {
    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      message: job.message,
      downloadUrl: job.downloadUrl,
      outputFilename: job.outputFilename,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }
}

export const videoRenderService = new VideoRenderService();
