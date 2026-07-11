import axios from 'axios';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../../config/env.js';

export interface MediaSearchInput {
  keywords: string[];
  outputDirectory: string;
  filenamePrefix?: string;
}

export interface MediaDownloadResult {
  filePath: string;
  filename: string;
  sourceUrl: string;
  pexelsUrl: string;
  creatorName: string;
  creatorUrl: string;
  width: number;
  height: number;
  durationSec: number;
}

interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  user: {
    name: string;
    url: string;
  };
  video_files: PexelsVideoFile[];
}

interface PexelsSearchResponse {
  videos?: PexelsVideo[];
}

export class MediaService {
  async searchAndDownloadVerticalVideo(
    input: MediaSearchInput,
  ): Promise<MediaDownloadResult> {
    const apiKey = env.PEXELS_API_KEY?.trim();

    if (!apiKey) {
      throw new Error(
        'PEXELS_API_KEY não configurada no Railway.',
      );
    }

    const keywords = input.keywords
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    if (keywords.length === 0) {
      throw new Error(
        'Nenhuma palavra-chave foi informada para buscar mídia.',
      );
    }

    const query = keywords.slice(0, 5).join(' ');

    const response = await axios.get<PexelsSearchResponse>(
      'https://api.pexels.com/videos/search',
      {
        headers: {
          Authorization: apiKey,
        },
        params: {
          query,
          orientation: 'portrait',
          size: 'medium',
          per_page: 15,
          page: 1,
        },
        timeout: 30_000,
      },
    );

    const videos = Array.isArray(response.data?.videos)
      ? response.data.videos
      : [];

    if (videos.length === 0) {
      throw new Error(
        `Nenhum vídeo encontrado no Pexels para: ${query}`,
      );
    }

    const selected = this.selectBestVerticalVideo(videos);

    if (!selected) {
      throw new Error(
        `Nenhum arquivo vertical compatível foi encontrado para: ${query}`,
      );
    }

    const outputDirectory = path.resolve(
      input.outputDirectory,
    );

    await mkdir(outputDirectory, {
      recursive: true,
    });

    const filenamePrefix =
      input.filenamePrefix?.trim() || 'scene';

    const filename =
      `${filenamePrefix}-${Date.now()}.mp4`;

    const filePath = path.join(
      outputDirectory,
      filename,
    );

    const mediaResponse = await axios.get<ArrayBuffer>(
      selected.file.link,
      {
        responseType: 'arraybuffer',
        timeout: 120_000,
      },
    );

    await writeFile(
      filePath,
      Buffer.from(mediaResponse.data),
    );

    return {
      filePath,
      filename,
      sourceUrl: selected.file.link,
      pexelsUrl: selected.video.url,
      creatorName: selected.video.user.name,
      creatorUrl: selected.video.user.url,
      width: selected.file.width,
      height: selected.file.height,
      durationSec: selected.video.duration,
    };
  }

  private selectBestVerticalVideo(
    videos: PexelsVideo[],
  ):
    | {
        video: PexelsVideo;
        file: PexelsVideoFile;
      }
    | undefined {
    const candidates = videos.flatMap((video) =>
      video.video_files
        .filter(
          (file) =>
            file.file_type === 'video/mp4' &&
            file.height > file.width &&
            file.width >= 540 &&
            file.height >= 960,
        )
        .map((file) => ({
          video,
          file,
          score: this.calculateQualityScore(file),
        })),
    );

    candidates.sort(
      (first, second) =>
        second.score - first.score,
    );

    const best = candidates[0];

    if (!best) {
      return undefined;
    }

    return {
      video: best.video,
      file: best.file,
    };
  }

  private calculateQualityScore(
    file: PexelsVideoFile,
  ): number {
    const targetWidth = 1080;
    const targetHeight = 1920;

    const widthDistance = Math.abs(
      file.width - targetWidth,
    );

    const heightDistance = Math.abs(
      file.height - targetHeight,
    );

    return (
      file.width * file.height -
      widthDistance * 100 -
      heightDistance * 100
    );
  }
}

export const mediaService = new MediaService();
