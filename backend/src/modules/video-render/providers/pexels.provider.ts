import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';

import { env } from '../../../config/env.js';

export interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  image: string;
  video_files: PexelsVideoFile[];
}

interface PexelsSearchResponse {
  videos?: PexelsVideo[];
}

class PexelsProvider {
  private getApiKey(): string {
    const apiKey = env.PEXELS_API_KEY?.trim();

    if (!apiKey) {
      throw new Error(
        'PEXELS_API_KEY não configurada no Railway.',
      );
    }

    return apiKey;
  }

  async search(
    query: string,
    perPage = 10,
  ): Promise<PexelsVideo[]> {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      throw new Error(
        'A busca do Pexels não pode estar vazia.',
      );
    }

    const { data } =
      await axios.get<PexelsSearchResponse>(
        'https://api.pexels.com/videos/search',
        {
          headers: {
            Authorization: this.getApiKey(),
          },
          params: {
            query: normalizedQuery,
            orientation: 'portrait',
            size: 'medium',
            per_page: Math.min(
              Math.max(perPage, 1),
              40,
            ),
            page: 1,
          },
          timeout: 30_000,
        },
      );

    return Array.isArray(data.videos)
      ? data.videos
      : [];
  }

  async download(
    video: PexelsVideo,
    outputDirectory = 'storage/videos',
  ): Promise<string> {
    const selectedFile =
      this.selectBestVideoFile(video);

    if (!selectedFile) {
      throw new Error(
        `Nenhum arquivo MP4 compatível foi encontrado para o vídeo ${video.id}.`,
      );
    }

    const directory = path.resolve(
      outputDirectory,
    );

    await fs.promises.mkdir(directory, {
      recursive: true,
    });

    const filename = `${video.id}-${Date.now()}.mp4`;

    const destination = path.join(
      directory,
      filename,
    );

    const response = await axios.get(
      selectedFile.link,
      {
        responseType: 'stream',
        timeout: 120_000,
      },
    );

    const writer =
      fs.createWriteStream(destination);

    response.data.pipe(writer);

    await new Promise<void>(
      (resolve, reject) => {
        writer.on('finish', resolve);

        writer.on('error', reject);

        response.data.on(
          'error',
          reject,
        );
      },
    );

    return destination;
  }

  async searchAndDownload(
    query: string,
    outputDirectory = 'storage/videos',
  ): Promise<string> {
    const videos = await this.search(
      query,
      15,
    );

    const firstVideo = videos[0];

    if (!firstVideo) {
      throw new Error(
        `Nenhum vídeo encontrado no Pexels para "${query}".`,
      );
    }

    return this.download(
      firstVideo,
      outputDirectory,
    );
  }

  private selectBestVideoFile(
    video: PexelsVideo,
  ): PexelsVideoFile | undefined {
    const compatibleFiles =
      video.video_files
        .filter(
          (file) =>
            file.file_type === 'video/mp4' &&
            file.height > file.width &&
            file.width >= 540 &&
            file.height >= 960,
        )
        .sort(
          (first, second) =>
            this.calculateFileScore(second) -
            this.calculateFileScore(first),
        );

    return compatibleFiles[0];
  }

  private calculateFileScore(
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

export const pexelsProvider =
  new PexelsProvider();
