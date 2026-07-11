import { v4 as uuid } from 'uuid';

import type {
  CreateVideoRenderDto,
  VideoRenderResult,
} from './video-render.dto.js';

export class VideoRenderService {
  async render(
    userId: string,
    dto: CreateVideoRenderDto,
  ): Promise<VideoRenderResult> {
    console.log('============================');
    console.log('VIDEO RENDER REQUEST');
    console.log('============================');

    console.log({
      userId,
      scriptId: dto.facelessScriptId,
      scenes: dto.scenes.length,
      resolution: dto.resolution,
      format: dto.format,
      voice: dto.voice,
    });

    return {
      id: uuid(),
      status: 'PENDING',
      progress: 0,
      message: 'Render iniciado.',
      createdAt: new Date().toISOString(),
    };
  }

  async status(
    id: string,
  ): Promise<VideoRenderResult> {
    return {
      id,
      status: 'PENDING',
      progress: 0,
      message: 'Aguardando processamento...',
      createdAt: new Date().toISOString(),
    };
  }
}

export const videoRenderService =
  new VideoRenderService();
