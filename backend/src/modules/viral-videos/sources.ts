/**
 * Coleta de vídeos virais e metadados públicos.
 *
 * Fontes:
 * - YouTube Data API v3
 * - TikTok Creative Center
 * - Reddit OAuth API
 *
 * Nenhum vídeo é baixado ou redistribuído.
 */

import axios from 'axios';
import { env } from '../../config/env.js';

import {
  viralPublishedAfter,
  type ViralTimeWindow,
  type ViralVideoDuration,
} from './viral-videos.dto.js';

export interface ViralComment {
  text: string;
  author?: string;
  likes: number;
  publishedAt?: Date;
}

export interface ViralVideo {
  externalId: string;

  platform:
    | 'YOUTUBE'
    | 'TIKTOK'
    | 'REDDIT';

  title: string;
  description?: string;

  channel?: string;
  channelId?: string;

  url: string;
  thumbnailUrl?: string;

  views: number;
  likes?: number;
  comments?: number;

  publishedAt: Date;

  language?: string;
  region?: string;

  tags: string[];
  hashtags?: string[];

  /**
   * Duração real do vídeo em segundos.
   */
  durationSec?: number;

  /**
   * Idade aproximada do conteúdo em horas.
   */
  ageHours?: number;

  /**
   * Métricas aproximadas desde a publicação.
   */
  viewsPerHour?: number;
  likesPerHour?: number;
  commentsPerHour?: number;

  /**
   * Taxas de engajamento.
   */
  engagementRate?: number;
  likeRate?: number;
  commentRate?: number;

  /**
   * Dados públicos do canal.
   */
  channelSubscribers?: number;
  channelTotalViews?: number;
  channelVideoCount?: number;
  channelHiddenSubscribers?: boolean;

  /**
   * Desempenho do vídeo em relação ao número
   * público de inscritos do canal.
   */
  channelOutperformance?: number;

  /**
   * Comentários públicos usados para
   * enriquecimento editorial.
   */
  topComments?: ViralComment[];

  raw: Record<string, unknown>;
}

export interface YouTubeSourceOptions {
  timeWindow?: ViralTimeWindow;
  duration?: ViralVideoDuration;
  includeComments?: boolean;
  includeChannelStats?: boolean;
  includeHashtags?: boolean;
}

interface YouTubeChannelStats {
  channelId: string;
  subscribers?: number;
  totalViews?: number;
  videoCount?: number;
  hiddenSubscribers: boolean;
}

const cacheKey = (
  ...parts: Array<string | number>
): string => `viral:${parts.join(':')}`;

export class ViralVideoSources {
  /**
   * YouTube Data API v3.
   *
   * Fluxo:
   * 1. search.list localiza vídeos.
   * 2. videos.list carrega detalhes, duração e estatísticas.
   * 3. channels.list carrega métricas públicas dos canais.
   * 4. commentThreads.list carrega comentários, quando solicitado.
   */
  async fromYouTube(
    query: string,
    region: string,
    language: string,
    maxResults: number,
    options: YouTubeSourceOptions = {},
  ): Promise<ViralVideo[]> {
    const apiKey =
      env.YOUTUBE_API_KEY?.trim();

    if (!apiKey) {
      console.error(
        '❌ YOUTUBE_API_KEY não configurada.',
      );

      return [];
    }

    const normalizedQuery =
      query.trim();

    const normalizedRegion =
      region.trim().toUpperCase();

    const normalizedLanguage =
      language
        .trim()
        .toLowerCase()
        .split('-')[0] || 'pt';

    const validRegion =
      /^[A-Z]{2}$/.test(
        normalizedRegion,
      )
        ? normalizedRegion
        : undefined;

    const validLanguage =
      /^[a-z]{2,3}$/.test(
        normalizedLanguage,
      )
        ? normalizedLanguage
        : undefined;

    const limit = Math.min(
      Math.max(maxResults || 25, 1),
      50,
    );

    const timeWindow =
      options.timeWindow ?? '30d';

    const duration =
      options.duration ?? 'ANY';

    const includeComments =
      options.includeComments ?? false;

    const includeChannelStats =
      options.includeChannelStats ?? true;

    const includeHashtags =
      options.includeHashtags ?? true;

    try {
      const searchParams:
        Record<string, string | number> = {
          key: apiKey,
          part: 'snippet',
          type: 'video',
          maxResults: limit,
          order: 'viewCount',
          publishedAfter:
            viralPublishedAfter(
              timeWindow,
            ).toISOString(),
          safeSearch: 'moderate',
        };

      if (normalizedQuery) {
        searchParams.q =
          normalizedQuery;
      }

      if (validRegion) {
        searchParams.regionCode =
          validRegion;
      }

      if (validLanguage) {
        searchParams.relevanceLanguage =
          validLanguage;
      }

      const youtubeDuration =
        this.mapYouTubeDuration(
          duration,
        );

      if (youtubeDuration) {
        searchParams.videoDuration =
          youtubeDuration;
      }

      console.log(
        'YouTube intelligence search:',
        {
          query:
            normalizedQuery ||
            '(busca geral)',

          region:
            validRegion ??
            'não informada',

          language:
            validLanguage ??
            'não informado',

          timeWindow,
          duration,
          maxResults: limit,
          includeComments,
          includeChannelStats,
          includeHashtags,
        },
      );

      const searchResponse =
        await axios.get(
          'https://www.googleapis.com/youtube/v3/search',
          {
            params: searchParams,
            timeout: 20_000,
          },
        );

      const searchItems: any[] =
        Array.isArray(
          searchResponse.data?.items,
        )
          ? searchResponse.data.items
          : [];

      const videoIds = Array.from(
        new Set<string>(
          searchItems
            .map(
              (item: any) =>
                item?.id?.videoId,
            )
            .filter(
              (
                videoId: unknown,
              ): videoId is string =>
                typeof videoId ===
                  'string' &&
                videoId.length > 0,
            ),
        ),
      );

      if (
        videoIds.length === 0
      ) {
        console.warn(
          '⚠️ YouTube não encontrou vídeos.',
          {
            query:
              normalizedQuery,

            region:
              validRegion,

            language:
              validLanguage,

            timeWindow,
          },
        );

        return [];
      }

      const videosResponse =
        await axios.get(
          'https://www.googleapis.com/youtube/v3/videos',
          {
            params: {
              key: apiKey,

              part:
                'snippet,statistics,contentDetails,status',

              id:
                videoIds.join(','),

              maxResults:
                limit,
            },

            timeout:
              20_000,
          },
        );

      const items: any[] =
        Array.isArray(
          videosResponse.data?.items,
        )
          ? videosResponse.data.items
          : [];

      const channelIds =
        Array.from(
          new Set<string>(
            items
              .map(
                (item: any) =>
                  item?.snippet
                    ?.channelId,
              )
              .filter(
                (
                  channelId: unknown,
                ): channelId is string =>
                  typeof channelId ===
                    'string' &&
                  channelId.length > 0,
              ),
          ),
        );

      const channelStats =
        includeChannelStats
          ? await this.getYouTubeChannelStats(
              apiKey,
              channelIds,
            )
          : new Map<
              string,
              YouTubeChannelStats
            >();

      /**
       * Para evitar muitas chamadas,
       * os comentários são carregados somente
       * para os cinco primeiros vídeos.
       */
      const commentsByVideo =
        includeComments
          ? await this.getYouTubeComments(
              apiKey,
              items
                .slice(0, 5)
                .map(
                  (
                    item: any,
                  ): string =>
                    String(
                      item?.id ??
                        '',
                    ),
                )
                .filter(
                  (
                    videoId: string,
                  ) =>
                    videoId.length >
                    0,
                ),
            )
          : new Map<
              string,
              ViralComment[]
            >();

      const results =
        items
          .filter(
            (
              item: any,
            ): boolean =>
              typeof item?.id ===
                'string' &&
              item.id.length > 0,
          )
          .map(
            (
              item: any,
            ): ViralVideo => {
              const snippet =
                item?.snippet ?? {};

              const statistics =
                item?.statistics ?? {};

              const contentDetails =
                item?.contentDetails ??
                {};

              const title =
                this.cleanText(
                  snippet.title,
                );

              const description =
                this.cleanText(
                  snippet.description,
                ).slice(
                  0,
                  1_500,
                );

              const rawTags:
                unknown[] =
                Array.isArray(
                  snippet.tags,
                )
                  ? snippet.tags
                  : [];

              const apiTags =
                rawTags
                  .filter(
                    (
                      tag: unknown,
                    ): tag is string =>
                      typeof tag ===
                      'string',
                  )
                  .map(
                    (
                      tag: string,
                    ): string =>
                      this.cleanText(
                        tag,
                      ),
                  )
                  .filter(
                    (
                      tag: string,
                    ): boolean =>
                      tag.length > 0,
                  );

              const hashtags =
                includeHashtags
                  ? this.extractHashtags(
                      `${title}\n${description}`,
                    )
                  : [];

              const tags =
                this.uniqueStrings([
                  ...apiTags,
                  ...hashtags,
                ]).slice(
                  0,
                  50,
                );

              const publishedAt =
                this.parseDate(
                  snippet.publishedAt,
                );

              const ageMs =
                Math.max(
                  Date.now() -
                    publishedAt.getTime(),

                  60 * 1000,
                );

              /**
               * Evita valores irreais em vídeos
               * publicados há poucos segundos.
               */
              const ageHours =
                Math.max(
                  ageMs /
                    (
                      60 *
                      60 *
                      1000
                    ),

                  0.25,
                );

              const views =
                this.safeNumber(
                  statistics.viewCount,
                );

              const likes =
                this.safeNumber(
                  statistics.likeCount,
                );

              const comments =
                this.safeNumber(
                  statistics.commentCount,
                );

              const durationSec =
                this.parseIsoDuration(
                  contentDetails.duration,
                );

              const channelId =
                typeof snippet.channelId ===
                  'string'
                  ? snippet.channelId
                  : undefined;

              const channel =
                channelId
                  ? channelStats.get(
                      channelId,
                    )
                  : undefined;

              const subscribers =
                channel?.subscribers;

              const likeRate =
                views > 0
                  ? likes / views
                  : 0;

              const commentRate =
                views > 0
                  ? comments /
                    views
                  : 0;

              const engagementRate =
                views > 0
                  ? (
                      likes +
                      comments
                    ) /
                    views
                  : 0;

              const channelOutperformance =
                subscribers &&
                subscribers > 0
                  ? views /
                    subscribers
                  : undefined;

              return {
                externalId:
                  String(item.id),

                platform:
                  'YOUTUBE',

                title,

                description:
                  description ||
                  undefined,

                channel:
                  this.cleanText(
                    snippet.channelTitle,
                  ) ||
                  undefined,

                channelId,

                url:
                  `https://www.youtube.com/watch?v=${item.id}`,

                thumbnailUrl:
                  snippet
                    .thumbnails
                    ?.maxres
                    ?.url ??
                  snippet
                    .thumbnails
                    ?.standard
                    ?.url ??
                  snippet
                    .thumbnails
                    ?.high
                    ?.url ??
                  snippet
                    .thumbnails
                    ?.medium
                    ?.url ??
                  snippet
                    .thumbnails
                    ?.default
                    ?.url,

                views,
                likes,
                comments,

                publishedAt,

                language:
                  snippet
                    .defaultAudioLanguage ??
                  snippet
                    .defaultLanguage ??
                  validLanguage ??
                  language,

                region:
                  validRegion ??
                  region,

                tags,
                hashtags,

                durationSec,
                ageHours,

                viewsPerHour:
                  views /
                  ageHours,

                likesPerHour:
                  likes /
                  ageHours,

                commentsPerHour:
                  comments /
                  ageHours,

                likeRate,
                commentRate,
                engagementRate,

                channelSubscribers:
                  channel
                    ?.subscribers,

                channelTotalViews:
                  channel
                    ?.totalViews,

                channelVideoCount:
                  channel
                    ?.videoCount,

                channelHiddenSubscribers:
                  channel
                    ?.hiddenSubscribers,

                channelOutperformance,

                topComments:
                  commentsByVideo.get(
                    String(
                      item.id,
                    ),
                  ) ?? [],

                raw: {
                  video:
                    item,

                  channel:
                    channel ??
                    null,

                  searchWindow:
                    timeWindow,
                },
              };
            },
          );

      console.log(
        `✅ YouTube retornou ${results.length} vídeos enriquecidos.`,
      );

      return results;
    } catch (error: unknown) {
      if (
        axios.isAxiosError(
          error,
        )
      ) {
        console.error(
          '❌ YouTube intelligence API error:',
          {
            status:
              error.response
                ?.status,

            message:
              error.message,

            response:
              error.response
                ?.data,

            query:
              normalizedQuery,

            region:
              validRegion,

            language:
              validLanguage,

            timeWindow,
          },
        );
      } else {
        console.error(
          '❌ Erro desconhecido na busca do YouTube:',
          error,
        );
      }

      return [];
    }
  }

  /**
   * TikTok Creative Center.
   *
   * Esse endpoint público não é uma API oficial estável
   * e pode mudar sem aviso.
   */
  async fromTikTok(
    query: string,
    region: string,
    language: string,
    maxResults: number,
  ): Promise<ViralVideo[]> {
    const regionCode =
      region
        .trim()
        .toUpperCase();

    const limit =
      Math.min(
        Math.max(
          maxResults || 25,
          1,
        ),
        50,
      );

    const url =
      'https://ads.tiktok.com/business/creativecenter/api/v1/' +
      'popular_trending/hashtags/list';

    try {
      const { data } =
        await axios.get(
          url,
          {
            params: {
              region:
                regionCode,

              page:
                1,

              limit,
            },

            headers: {
              'User-Agent':
                'Mozilla/5.0 (compatible; ViralForgeAI/1.0)',

              Accept:
                'application/json',
            },

            timeout:
              20_000,
          },
        );

      const list: any[] =
        Array.isArray(
          data?.data?.list,
        )
          ? data.data.list
          : Array.isArray(
                data?.list,
              )
            ? data.list
            : [];

      const normalizedQuery =
        query
          .trim()
          .toLowerCase();

      const filtered:
        any[] =
        normalizedQuery
          ? list.filter(
              (
                item: any,
              ): boolean => {
                const name =
                  String(
                    item
                      ?.hashtag_name ??
                      item?.name ??
                      '',
                  ).toLowerCase();

                return name.includes(
                  normalizedQuery,
                );
              },
            )
          : list;

      return filtered
        .slice(
          0,
          limit,
        )
        .map(
          (
            item: any,
          ): ViralVideo => {
            const name =
              this.cleanText(
                item
                  ?.hashtag_name ??
                  item?.name ??
                  '',
              );

            const views =
              this.safeNumber(
                item
                  ?.video_views ??
                  item?.views,
              );

            const videoCount =
              this.safeNumber(
                item
                  ?.publish_cnt ??
                  item
                    ?.video_count,
              );

            return {
              externalId:
                String(
                  item
                    ?.hashtag_id ??
                    name,
                ),

              platform:
                'TIKTOK',

              title:
                name
                  ? `#${name}`
                  : 'Tendência do TikTok',

              description:
                videoCount > 0
                  ? `${videoCount} vídeos públicos associados à hashtag.`
                  : undefined,

              url:
                `https://www.tiktok.com/tag/${encodeURIComponent(
                  name,
                )}`,

              views,

              publishedAt:
                new Date(),

              language,

              region:
                regionCode,

              tags:
                name
                  ? [name]
                  : [],

              hashtags:
                name
                  ? [name]
                  : [],

              raw:
                item,
            };
          },
        );
    } catch (error: unknown) {
      if (
        axios.isAxiosError(
          error,
        )
      ) {
        console.error(
          '❌ TikTok Creative Center error:',
          {
            status:
              error.response
                ?.status,

            message:
              error.message,

            response:
              error.response
                ?.data,
          },
        );
      } else {
        console.error(
          '❌ Erro desconhecido no TikTok:',
          error,
        );
      }

      return [];
    }
  }

  /**
   * Reddit — posts em alta contendo vídeo.
   */
  async fromReddit(
    query: string,
    language: string,
    maxResults: number,
  ): Promise<ViralVideo[]> {
    try {
      const token =
        await this.getRedditToken();

      if (!token) {
        console.warn(
          '⚠️ Credenciais do Reddit não configuradas.',
        );

        return [];
      }

      const limit =
        Math.min(
          Math.max(
            maxResults || 25,
            1,
          ),
          100,
        );

      const url =
        query.trim()
          ? 'https://oauth.reddit.com/search'
          : 'https://oauth.reddit.com/r/all/top';

      const params:
        Record<
          string,
          string | number
        > =
        query.trim()
          ? {
              q:
                query.trim(),

              sort:
                'top',

              t:
                'month',

              limit,

              type:
                'link',
            }
          : {
              t:
                'week',

              limit,
            };

      const { data } =
        await axios.get(
          url,
          {
            params,

            headers: {
              Authorization:
                `Bearer ${token}`,

              'User-Agent':
                env.REDDIT_USER_AGENT,
            },

            timeout:
              20_000,
          },
        );

      const children: any[] =
        Array.isArray(
          data?.data?.children,
        )
          ? data.data.children
          : [];

      return children
        .map(
          (
            child: any,
          ): ViralVideo | null => {
            const item =
              child?.data ?? {};

            const destination =
              String(
                item
                  ?.url_overridden_by_dest ??
                  item?.url ??
                  '',
              );

            const isVideo =
              item?.is_video ===
                true ||
              /reddit\.com\/video|v\.redd\.it|\.mp4(?:$|\?)/i.test(
                destination,
              );

            if (!isVideo) {
              return null;
            }

            const timestamp =
              this.safeNumber(
                item
                  ?.created_utc,
              );

            const publishedAt =
              timestamp > 0
                ? new Date(
                    timestamp *
                      1000,
                  )
                : new Date();

            const ageHours =
              Math.max(
                (
                  Date.now() -
                  publishedAt.getTime()
                ) /
                  (
                    60 *
                    60 *
                    1000
                  ),

                0.25,
              );

            const views =
              this.safeNumber(
                item
                  ?.view_count ??
                  item?.score,
              );

            const likes =
              this.safeNumber(
                item?.ups,
              );

            const comments =
              this.safeNumber(
                item
                  ?.num_comments,
              );

            const title =
              this.cleanText(
                item?.title,
              );

            const description =
              this.cleanText(
                item?.selftext,
              ).slice(
                0,
                1_000,
              );

            const subreddit =
              this.cleanText(
                item?.subreddit,
              );

            return {
              externalId:
                String(
                  item?.id ??
                    '',
                ),

              platform:
                'REDDIT',

              title,

              description:
                description ||
                undefined,

              channel:
                subreddit ||
                undefined,

              url:
                destination ||
                `https://reddit.com${item?.permalink ?? ''}`,

              thumbnailUrl:
                this.getRedditThumbnail(
                  item,
                ),

              views,
              likes,
              comments,

              publishedAt,
              ageHours,

              viewsPerHour:
                views /
                ageHours,

              likesPerHour:
                likes /
                ageHours,

              commentsPerHour:
                comments /
                ageHours,

              likeRate:
                views > 0
                  ? likes /
                    views
                  : 0,

              commentRate:
                views > 0
                  ? comments /
                    views
                  : 0,

              engagementRate:
                views > 0
                  ? (
                      likes +
                      comments
                    ) /
                    views
                  : 0,

              language,

              tags:
                subreddit
                  ? [subreddit]
                  : [],

              hashtags:
                this.extractHashtags(
                  `${title}\n${description}`,
                ),

              durationSec:
                this.safeOptionalNumber(
                  item
                    ?.secure_media
                    ?.reddit_video
                    ?.duration,
                ),

              raw:
                item,
            };
          },
        )
        .filter(
          (
            item: ViralVideo | null,
          ): item is ViralVideo =>
            item !==
              null &&
            item.externalId
              .length > 0,
        );
    } catch (error: unknown) {
      if (
        axios.isAxiosError(
          error,
        )
      ) {
        console.error(
          '❌ Reddit API error:',
          {
            status:
              error.response
                ?.status,

            message:
              error.message,

            response:
              error.response
                ?.data,
          },
        );
      } else {
        console.error(
          '❌ Erro desconhecido no Reddit:',
          error,
        );
      }

      return [];
    }
  }

  private async getYouTubeChannelStats(
    apiKey: string,
    channelIds: string[],
  ): Promise<
    Map<
      string,
      YouTubeChannelStats
    >
  > {
    const result =
      new Map<
        string,
        YouTubeChannelStats
      >();

    if (
      channelIds.length ===
      0
    ) {
      return result;
    }

    try {
      const response =
        await axios.get(
          'https://www.googleapis.com/youtube/v3/channels',
          {
            params: {
              key:
                apiKey,

              part:
                'snippet,statistics',

              id:
                channelIds
                  .slice(
                    0,
                    50,
                  )
                  .join(','),

              maxResults:
                50,
            },

            timeout:
              20_000,
          },
        );

      const items: any[] =
        Array.isArray(
          response.data?.items,
        )
          ? response.data.items
          : [];

      for (
        const item of items
      ) {
        const channelId =
          String(
            item?.id ??
              '',
          );

        if (!channelId) {
          continue;
        }

        const statistics =
          item?.statistics ??
          {};

        const hiddenSubscribers =
          statistics
            ?.hiddenSubscriberCount ===
          true;

        result.set(
          channelId,
          {
            channelId,

            subscribers:
              hiddenSubscribers
                ? undefined
                : this.safeOptionalNumber(
                    statistics
                      ?.subscriberCount,
                  ),

            totalViews:
              this.safeOptionalNumber(
                statistics
                  ?.viewCount,
              ),

            videoCount:
              this.safeOptionalNumber(
                statistics
                  ?.videoCount,
              ),

            hiddenSubscribers,
          },
        );
      }
    } catch (error: unknown) {
      if (
        axios.isAxiosError(
          error,
        )
      ) {
        console.error(
          '⚠️ Não foi possível carregar estatísticas dos canais do YouTube:',
          {
            status:
              error.response
                ?.status,

            message:
              error.message,

            response:
              error.response
                ?.data,
          },
        );
      } else {
        console.error(
          '⚠️ Erro desconhecido ao carregar canais:',
          error,
        );
      }
    }

    return result;
  }

  private async getYouTubeComments(
    apiKey: string,
    videoIds: string[],
  ): Promise<
    Map<
      string,
      ViralComment[]
    >
  > {
    const result =
      new Map<
        string,
        ViralComment[]
      >();

    for (
      const videoId of videoIds
    ) {
      try {
        const response =
          await axios.get(
            'https://www.googleapis.com/youtube/v3/commentThreads',
            {
              params: {
                key:
                  apiKey,

                part:
                  'snippet',

                videoId,

                maxResults:
                  10,

                order:
                  'relevance',

                textFormat:
                  'plainText',
              },

              timeout:
                15_000,
            },
          );

        const items: any[] =
          Array.isArray(
            response.data?.items,
          )
            ? response.data.items
            : [];

        const comments =
          items
            .map(
              (
                item: any,
              ): ViralComment | null => {
                const snippet =
                  item
                    ?.snippet
                    ?.topLevelComment
                    ?.snippet;

                if (!snippet) {
                  return null;
                }

                const text =
                  this.cleanText(
                    snippet
                      ?.textDisplay ??
                      snippet
                        ?.textOriginal,
                  );

                if (!text) {
                  return null;
                }

                return {
                  text:
                    text.slice(
                      0,
                      500,
                    ),

                  author:
                    this.cleanText(
                      snippet
                        ?.authorDisplayName,
                    ) ||
                    undefined,

                  likes:
                    this.safeNumber(
                      snippet
                        ?.likeCount,
                    ),

                  publishedAt:
                    this.parseOptionalDate(
                      snippet
                        ?.publishedAt,
                    ),
                };
              },
            )
            .filter(
              (
                comment:
                  ViralComment | null,
              ): comment is ViralComment =>
                comment !==
                null,
            );

        result.set(
          videoId,
          comments,
        );
      } catch (error: unknown) {
        /**
         * Comentários podem estar desativados.
         * Isso não deve cancelar toda a busca.
         */
        if (
          axios.isAxiosError(
            error,
          )
        ) {
          console.warn(
            `⚠️ Comentários indisponíveis para o vídeo ${videoId}.`,
            {
              status:
                error.response
                  ?.status,

              reason:
                error.response
                  ?.data
                  ?.error
                  ?.errors?.[0]
                  ?.reason,
            },
          );
        }
      }
    }

    return result;
  }

  private mapYouTubeDuration(
    duration: ViralVideoDuration,
  ):
    | 'short'
    | 'medium'
    | 'long'
    | undefined {
    switch (duration) {
      case 'SHORT':
        return 'short';

      case 'MEDIUM':
        return 'medium';

      case 'LONG':
        return 'long';

      case 'ANY':
      default:
        return undefined;
    }
  }

  private extractHashtags(
    value: string,
  ): string[] {
    const matches =
      value.match(
        /#[\p{L}\p{N}_-]+/gu,
      ) ?? [];

    return this.uniqueStrings(
      matches.map(
        (
          match: string,
        ): string =>
          match
            .replace(
              /^#+/,
              '',
            )
            .trim(),
      ),
    ).slice(
      0,
      30,
    );
  }

  private parseIsoDuration(
    value: unknown,
  ): number | undefined {
    if (
      typeof value !==
      'string'
    ) {
      return undefined;
    }

    const match =
      value.match(
        /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/,
      );

    if (!match) {
      return undefined;
    }

    const days =
      Number(
        match[1] ??
          0,
      );

    const hours =
      Number(
        match[2] ??
          0,
      );

    const minutes =
      Number(
        match[3] ??
          0,
      );

    const seconds =
      Number(
        match[4] ??
          0,
      );

    const total =
      days *
        86_400 +
      hours *
        3_600 +
      minutes *
        60 +
      seconds;

    return Number.isFinite(
      total,
    )
      ? Math.round(
          total,
        )
      : undefined;
  }

  private parseDate(
    value: unknown,
  ): Date {
    const date =
      typeof value ===
      'string'
        ? new Date(
            value,
          )
        : new Date();

    return Number.isNaN(
      date.getTime(),
    )
      ? new Date()
      : date;
  }

  private parseOptionalDate(
    value: unknown,
  ): Date | undefined {
    if (
      typeof value !==
      'string'
    ) {
      return undefined;
    }

    const date =
      new Date(
        value,
      );

    return Number.isNaN(
      date.getTime(),
    )
      ? undefined
      : date;
  }

  private cleanText(
    value: unknown,
  ): string {
    if (
      typeof value !==
      'string'
    ) {
      return '';
    }

    return value
      .replace(
        /&amp;/gi,
        '&',
      )
      .replace(
        /&quot;/gi,
        '"',
      )
      .replace(
        /&#39;/gi,
        "'",
      )
      .replace(
        /&lt;/gi,
        '<',
      )
      .replace(
        /&gt;/gi,
        '>',
      )
      .replace(
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,
        '',
      )
      .replace(
        /\s+/g,
        ' ',
      )
      .trim();
  }

  private safeNumber(
    value: unknown,
  ): number {
    const number =
      Number(
        value ??
          0,
      );

    return Number.isFinite(
      number,
    )
      ? Math.max(
          number,
          0,
        )
      : 0;
  }

  private safeOptionalNumber(
    value: unknown,
  ): number | undefined {
    if (
      value ===
        undefined ||
      value ===
        null ||
      value ===
        ''
    ) {
      return undefined;
    }

    const number =
      Number(
        value,
      );

    return Number.isFinite(
      number,
    )
      ? Math.max(
          number,
          0,
        )
      : undefined;
  }

  private uniqueStrings(
    values: string[],
  ): string[] {
    const seen =
      new Set<string>();

    const result:
      string[] = [];

    for (
      const value of values
    ) {
      const cleaned =
        this.cleanText(
          value,
        );

      const normalized =
        cleaned
          .normalize(
            'NFD',
          )
          .replace(
            /[\u0300-\u036f]/g,
            '',
          )
          .toLowerCase();

      if (
        !cleaned ||
        !normalized ||
        seen.has(
          normalized,
        )
      ) {
        continue;
      }

      seen.add(
        normalized,
      );

      result.push(
        cleaned,
      );
    }

    return result;
  }

  private getRedditThumbnail(
    item: any,
  ): string | undefined {
    const previewUrl =
      item
        ?.preview
        ?.images?.[0]
        ?.source?.url;

    if (
      typeof previewUrl ===
        'string' &&
      previewUrl.startsWith(
        'http',
      )
    ) {
      return previewUrl.replace(
        /&amp;/g,
        '&',
      );
    }

    const thumbnail =
      item?.thumbnail;

    return typeof thumbnail ===
        'string' &&
      thumbnail.startsWith(
        'http',
      )
      ? thumbnail
      : undefined;
  }

  private redditToken: {
    token: string;
    expiresAt: number;
  } | null = null;

  private async getRedditToken(): Promise<
    string | null
  > {
    if (
      !env.REDDIT_CLIENT_ID ||
      !env.REDDIT_CLIENT_SECRET
    ) {
      return null;
    }

    if (
      this.redditToken &&
      this.redditToken
        .expiresAt >
        Date.now() +
          60_000
    ) {
      return this.redditToken
        .token;
    }

    try {
      const auth =
        Buffer.from(
          `${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`,
        ).toString(
          'base64',
        );

      const { data } =
        await axios.post(
          'https://www.reddit.com/api/v1/access_token',

          'grant_type=client_credentials',

          {
            headers: {
              Authorization:
                `Basic ${auth}`,

              'Content-Type':
                'application/x-www-form-urlencoded',

              'User-Agent':
                env.REDDIT_USER_AGENT,
            },

            timeout:
              15_000,
          },
        );

      const token =
        String(
          data
            ?.access_token ??
            '',
        );

      const expiresIn =
        Number(
          data
            ?.expires_in ??
            3_600,
        );

      if (!token) {
        return null;
      }

      this.redditToken = {
        token,

        expiresAt:
          Date.now() +
          expiresIn *
            1000,
      };

      return token;
    } catch (error: unknown) {
      console.error(
        '❌ Não foi possível autenticar no Reddit:',
        error,
      );

      return null;
    }
  }
}

export const viralVideoSources =
  new ViralVideoSources();

export {
  cacheKey as viralCacheKey,
};
