import path from 'node:path';

import {
  pexelsProvider,
  type PexelsVideo,
} from './providers/pexels.provider.js';

export interface MediaSceneInput {
  order: number;
  name?: string;
  visual?: string;
  searchKeywords?: string[];
  durationSec: number;
}

export interface DownloadedSceneMedia {
  order: number;
  query: string;
  filePath: string;
  durationSec: number;
  source: 'PEXELS';
  sourceVideoId: number;
  sourcePageUrl: string;
}

export interface DownloadSceneMediaInput {
  scenes: MediaSceneInput[];
  outputDirectory: string;
}

export class MediaService {
  async downloadMediaForScenes(
    input: DownloadSceneMediaInput,
  ): Promise<DownloadedSceneMedia[]> {
    if (!Array.isArray(input.scenes) || input.scenes.length === 0) {
      throw new Error(
        'Nenhuma cena foi informada para buscar mídias.',
      );
    }

    const outputDirectory = path.resolve(
      input.outputDirectory,
    );

    const orderedScenes = [...input.scenes].sort(
      (first, second) => first.order - second.order,
    );

    const downloaded: DownloadedSceneMedia[] = [];

    for (const scene of orderedScenes) {
      const query = this.buildSearchQuery(scene);

      const videos = await pexelsProvider.search(
        query,
        15,
      );

      const selectedVideo =
        this.selectVideoForScene(
          videos,
          scene.order,
        );

      if (!selectedVideo) {
        throw new Error(
          `Nenhuma mídia foi encontrada para a cena ${scene.order}: "${query}".`,
        );
      }

      const sceneDirectory = path.join(
        outputDirectory,
        `scene-${String(scene.order).padStart(3, '0')}`,
      );

      const filePath = await pexelsProvider.download(
        selectedVideo,
        sceneDirectory,
      );

      downloaded.push({
        order: scene.order,
        query,
        filePath,
        durationSec: Math.max(
          scene.durationSec,
          1,
        ),
        source: 'PEXELS',
        sourceVideoId: selectedVideo.id,
        sourcePageUrl: selectedVideo.url,
      });
    }

    return downloaded;
  }

  async searchAndDownloadSingleVideo(
    keywords: string[],
    outputDirectory: string,
  ): Promise<string> {
    const query = keywords
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .slice(0, 5)
      .join(' ');

    if (!query) {
      throw new Error(
        'Nenhuma palavra-chave válida foi informada para buscar mídia.',
      );
    }

    return pexelsProvider.searchAndDownload(
      query,
      outputDirectory,
    );
  }

  private buildSearchQuery(
    scene: MediaSceneInput,
  ): string {
    const keywords = Array.isArray(
      scene.searchKeywords,
    )
      ? scene.searchKeywords
          .map((keyword) => keyword.trim())
          .filter(Boolean)
      : [];

    if (keywords.length > 0) {
      return keywords
        .slice(0, 5)
        .join(' ');
    }

    const visual =
      scene.visual?.trim();

    if (visual) {
      return visual
        .split(/\s+/)
        .slice(0, 8)
        .join(' ');
    }

    const name =
      scene.name?.trim();

    if (name) {
      return name;
    }

    throw new Error(
      `A cena ${scene.order} não possui palavras-chave, descrição visual ou nome para buscar mídia.`,
    );
  }

  private selectVideoForScene(
    videos: PexelsVideo[],
    sceneOrder: number,
  ): PexelsVideo | undefined {
    if (videos.length === 0) {
      return undefined;
    }

    /*
     * Alterna os resultados entre as cenas para reduzir
     * a chance de usar sempre o mesmo primeiro vídeo.
     */
    const index =
      Math.abs(sceneOrder - 1) %
      videos.length;

    return videos[index];
  }
}

export const mediaService =
  new MediaService();
