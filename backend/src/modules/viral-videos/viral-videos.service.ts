import { cache } from '../../services/cache/cache.service.js';

import {
  viralVideoSources,
  type ViralVideo,
} from './sources.js';

import {
  computeViralScoreBreakdown,
  type ViralScoreBreakdown,
} from './scorer.js';

import {
  viralTimeWindowToMs,
  type ListViralVideosDto,
  type SearchViralVideosDto,
  type ViralOrder,
  type ViralPlatform,
  type ViralTimeWindow,
  type ViralVideoDuration,
} from './viral-videos.dto.js';

export interface ScoredViralVideo
  extends ViralVideo {
  score: number;
  scoreBreakdown: ViralScoreBreakdown;
}

export interface ViralVideosListResult {
  items: ScoredViralVideo[];
  total: number;
  page: number;
  pageSize: number;
  sourcesUsed: string[];
}

export interface ViralVideosSearchResult {
  items: ScoredViralVideo[];
  total: number;
  sourcesUsed: string[];
}

interface SearchAcrossSourcesOptions {
  niche?: string;
  platform: ViralPlatform;
  region: string;
  language: string;
  maxResults: number;

  timeWindow: ViralTimeWindow;
  duration: ViralVideoDuration;

  includeComments: boolean;
  includeChannelStats: boolean;
  includeHashtags: boolean;
}

export class ViralVideosService {
  /**
   * Lista vídeos virais com cache de 10 minutos.
   */
  async list(
    dto: ListViralVideosDto,
  ): Promise<ViralVideosListResult> {
    const key =
      `viral:list:${JSON.stringify(dto)}`;

    return cache.wrap(
      key,
      600,
      async (): Promise<ViralVideosListResult> => {
        const requestedResults =
          Math.min(
            Math.max(
              dto.page * dto.pageSize,
              dto.pageSize * 2,
            ),
            50,
          );

        const items =
          await this.searchAcrossSources({
            niche: dto.niche,
            platform: dto.platform,
            region: dto.region,
            language: dto.language,
            maxResults: requestedResults,
            timeWindow: dto.timeWindow,
            duration: dto.duration,
            includeComments:
              dto.includeComments,
            includeChannelStats:
              dto.includeChannelStats,
            includeHashtags:
              dto.includeHashtags,
          });

        const scored =
          this.scoreVideos(items)
            .filter(
              (
                video: ScoredViralVideo,
              ): boolean =>
                video.score >=
                dto.minScore,
            );

        const ordered =
          this.sortVideos(
            scored,
            dto.order,
          );

        const start =
          (dto.page - 1) *
          dto.pageSize;

        const paged =
          ordered.slice(
            start,
            start + dto.pageSize,
          );

        return {
          items: paged,
          total: ordered.length,
          page: dto.page,
          pageSize: dto.pageSize,
          sourcesUsed:
            this.getSourcesUsed(
              items,
            ),
        };
      },
    );
  }

  /**
   * Executa uma busca nova, sem cache.
   */
  async search(
    dto: SearchViralVideosDto,
  ): Promise<ViralVideosSearchResult> {
    const items =
      await this.searchAcrossSources({
        niche: dto.niche,
        platform: dto.platform,
        region: dto.region,
        language: dto.language,
        maxResults: dto.maxResults,
        timeWindow: dto.timeWindow,
        duration: dto.duration,
        includeComments:
          dto.includeComments,
        includeChannelStats:
          dto.includeChannelStats,
        includeHashtags:
          dto.includeHashtags,
      });

    const scored =
      this.scoreVideos(items)
        .filter(
          (
            video: ScoredViralVideo,
          ): boolean =>
            video.score >=
            dto.minScore,
        );

    const ordered =
      this.sortVideos(
        scored,
        dto.order,
      ).slice(
        0,
        dto.maxResults,
      );

    return {
      items: ordered,
      total: ordered.length,
      sourcesUsed:
        this.getSourcesUsed(
          items,
        ),
    };
  }

  /**
   * Consulta as fontes selecionadas.
   */
  private async searchAcrossSources(
    options: SearchAcrossSourcesOptions,
  ): Promise<ViralVideo[]> {
    const tasks:
      Array<
        Promise<ViralVideo[]>
      > = [];

    if (
      options.platform ===
        'YOUTUBE' ||
      options.platform ===
        'ALL'
    ) {
      tasks.push(
        viralVideoSources.fromYouTube(
          options.niche ?? '',
          options.region,
          options.language,
          options.maxResults,
          {
            timeWindow:
              options.timeWindow,
            duration:
              options.duration,
            includeComments:
              options.includeComments,
            includeChannelStats:
              options.includeChannelStats,
            includeHashtags:
              options.includeHashtags,
          },
        ),
      );
    }

    if (
      options.platform ===
        'TIKTOK' ||
      options.platform ===
        'ALL'
    ) {
      tasks.push(
        viralVideoSources.fromTikTok(
          options.niche ?? '',
          options.region,
          options.language,
          options.maxResults,
        ),
      );
    }

    if (
      options.platform ===
        'REDDIT' ||
      options.platform ===
        'ALL'
    ) {
      tasks.push(
        viralVideoSources.fromReddit(
          options.niche ?? '',
          options.language,
          options.maxResults,
        ),
      );
    }

    if (tasks.length === 0) {
      return [];
    }

    /*
     * Uma fonte com falha não interrompe
     * os resultados das outras fontes.
     */
    const groups =
      await Promise.allSettled(
        tasks,
      );

    const collected:
      ViralVideo[] = [];

    for (const group of groups) {
      if (
        group.status ===
        'fulfilled'
      ) {
        collected.push(
          ...group.value,
        );
      } else {
        console.error(
          '❌ Uma fonte de vídeos virais falhou:',
          group.reason,
        );
      }
    }

    const unique =
      this.removeDuplicates(
        collected,
      );

    const timeFiltered =
      this.filterByTimeWindow(
        unique,
        options.timeWindow,
      );

    return this.filterByDuration(
      timeFiltered,
      options.duration,
    );
  }

  /**
   * Adiciona score e detalhamento.
   */
  private scoreVideos(
    items: ViralVideo[],
  ): ScoredViralVideo[] {
    return items.map(
      (
        video: ViralVideo,
      ): ScoredViralVideo => {
        const scoreBreakdown =
          computeViralScoreBreakdown(
            video,
          );

        return {
          ...video,
          score:
            scoreBreakdown.score,
          scoreBreakdown,
        };
      },
    );
  }

  /**
   * Ordena conforme o filtro escolhido.
   */
  private sortVideos(
    items: ScoredViralVideo[],
    order: ViralOrder,
  ): ScoredViralVideo[] {
    const sorted =
      [...items];

    switch (order) {
      case 'VIEW_VELOCITY':
        return sorted.sort(
          (
            first: ScoredViralVideo,
            second: ScoredViralVideo,
          ): number =>
            this.safeMetric(
              second.viewsPerHour,
            ) -
            this.safeMetric(
              first.viewsPerHour,
            ),
        );

      case 'ENGAGEMENT':
        return sorted.sort(
          (
            first: ScoredViralVideo,
            second: ScoredViralVideo,
          ): number =>
            this.safeMetric(
              second.engagementRate,
            ) -
            this.safeMetric(
              first.engagementRate,
            ),
        );

      case 'RECENT':
        return sorted.sort(
          (
            first: ScoredViralVideo,
            second: ScoredViralVideo,
          ): number =>
            second.publishedAt
              .getTime() -
            first.publishedAt
              .getTime(),
        );

      case 'VIEWS':
        return sorted.sort(
          (
            first: ScoredViralVideo,
            second: ScoredViralVideo,
          ): number =>
            second.views -
            first.views,
        );

      case 'VIRAL_SCORE':
      default:
        return sorted.sort(
          (
            first: ScoredViralVideo,
            second: ScoredViralVideo,
          ): number => {
            const scoreDifference =
              second.score -
              first.score;

            if (
              scoreDifference !== 0
            ) {
              return scoreDifference;
            }

            return (
              this.safeMetric(
                second.viewsPerHour,
              ) -
              this.safeMetric(
                first.viewsPerHour,
              )
            );
          },
        );
    }
  }

  /**
   * Aplica a janela temporal às fontes.
   *
   * O TikTok é mantido porque o Creative Center
   * não fornece uma data de publicação confiável
   * para cada tendência retornada.
   */
  private filterByTimeWindow(
    items: ViralVideo[],
    timeWindow: ViralTimeWindow,
  ): ViralVideo[] {
    const minimumDate =
      Date.now() -
      viralTimeWindowToMs(
        timeWindow,
      );

    return items.filter(
      (
        video: ViralVideo,
      ): boolean => {
        if (
          video.platform ===
          'TIKTOK'
        ) {
          return true;
        }

        const publishedTime =
          video.publishedAt
            instanceof Date
            ? video.publishedAt
                .getTime()
            : new Date(
                video.publishedAt,
              ).getTime();

        if (
          Number.isNaN(
            publishedTime,
          )
        ) {
          return false;
        }

        return (
          publishedTime >=
          minimumDate
        );
      },
    );
  }

  /**
   * Filtro de duração.
   *
   * O teste de ANY ocorre antes das demais condições.
   * Por isso não existe outro case ANY no switch.
   */
  private filterByDuration(
    items: ViralVideo[],
    duration: ViralVideoDuration,
  ): ViralVideo[] {
    if (
      duration === 'ANY'
    ) {
      return items;
    }

    return items.filter(
      (
        video: ViralVideo,
      ): boolean => {
        const durationSec =
          video.durationSec;

        /*
         * Fontes que não informam a duração
         * permanecem nos resultados.
         */
        if (
          durationSec ===
            undefined ||
          !Number.isFinite(
            durationSec,
          )
        ) {
          return true;
        }

        switch (duration) {
          case 'SHORT':
            return (
              durationSec <= 240
            );

          case 'MEDIUM':
            return (
              durationSec > 240 &&
              durationSec <= 1_200
            );

          case 'LONG':
            return (
              durationSec > 1_200
            );

          default:
            return true;
        }
      },
    );
  }

  /**
   * Remove duplicações dentro da mesma plataforma.
   */
  private removeDuplicates(
    items: ViralVideo[],
  ): ViralVideo[] {
    const seen =
      new Set<string>();

    const result:
      ViralVideo[] = [];

    for (const video of items) {
      const key =
        `${video.platform}:${video.externalId}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(video);
    }

    return result;
  }

  private getSourcesUsed(
    items: ViralVideo[],
  ): string[] {
    return Array.from(
      new Set<string>(
        items.map(
          (
            item: ViralVideo,
          ): string =>
            item.platform,
        ),
      ),
    );
  }

  private safeMetric(
    value: number | undefined,
  ): number {
    if (
      value === undefined ||
      !Number.isFinite(value)
    ) {
      return 0;
    }

    return value;
  }
}

export const viralVideosService =
  new ViralVideosService();
