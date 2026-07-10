/**
 * Coleta de vídeos virais via APIs oficiais.
 *
 * - YouTube Data API v3: search.list + videos.list
 * - TikTok: dados públicos do Creative Center
 * - Reddit: top posts
 *
 * Nenhum download. Apenas metadados públicos.
 */

import axios from 'axios';
import { env } from '../../config/env.js';

export interface ViralVideo {
  externalId: string;
  platform: 'YOUTUBE' | 'TIKTOK' | 'REDDIT';
  title: string;
  description?: string;
  channel?: string;
  url: string;
  thumbnailUrl?: string;
  views: number;
  likes?: number;
  comments?: number;
  publishedAt: Date;
  language?: string;
  region?: string;
  tags: string[];
  raw: Record<string, unknown>;
}

const cacheKey = (...parts: (string | number)[]) =>
  `viral:${parts.join(':')}`;

export class ViralVideoSources {
  /**
   * YouTube Data API v3.
   *
   * 1. search.list encontra os IDs dos vídeos.
   * 2. videos.list carrega estatísticas e detalhes.
   */
  async fromYouTube(
    query: string,
    region: string,
    language: string,
    maxResults: number,
  ): Promise<ViralVideo[]> {
    const apiKey = env.YOUTUBE_API_KEY?.trim();

    if (!apiKey) {
      console.error('❌ YOUTUBE_API_KEY não configurada.');
      return [];
    }

    const normalizedQuery = query.trim();
    const normalizedRegion = region.trim().toUpperCase();
    const normalizedLanguage =
      language.trim().toLowerCase().split('-')[0] ?? 'pt';

    const validRegion = /^[A-Z]{2}$/.test(normalizedRegion)
      ? normalizedRegion
      : undefined;

    const validLanguage = /^[a-z]{2,3}$/.test(normalizedLanguage)
      ? normalizedLanguage
      : undefined;

    const limit = Math.min(
      Math.max(maxResults || 25, 1),
      50,
    );

    try {
      /*
       * Primeira chamada: encontra os vídeos.
       */
      const searchParams: Record<string, string | number> = {
        key: apiKey,
        part: 'snippet',
        type: 'video',
        maxResults: limit,
      };

      if (normalizedQuery) {
        searchParams.q = normalizedQuery;
        searchParams.order = 'viewCount';
        searchParams.publishedAfter = new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
      } else {
        searchParams.order = 'viewCount';
      }

      if (validRegion) {
        searchParams.regionCode = validRegion;
      }

      if (validLanguage) {
        searchParams.relevanceLanguage = validLanguage;
      }

      console.log('YouTube viral search request:', {
        query: normalizedQuery,
        region: validRegion ?? 'omitted',
        language: validLanguage ?? 'omitted',
        maxResults: limit,
      });

      const searchResponse = await axios.get(
        'https://www.googleapis.com/youtube/v3/search',
        {
          params: searchParams,
          timeout: 15_000,
        },
      );

      const searchItems: any[] = Array.isArray(
        searchResponse.data?.items,
      )
        ? searchResponse.data.items
        : [];

      const videoIds = searchItems
        .map((item) => item.id?.videoId)
        .filter(
          (videoId): videoId is string =>
            typeof videoId === 'string' && videoId.length > 0,
        );

      if (videoIds.length === 0) {
        console.warn('⚠️ YouTube não encontrou vídeos.', {
          query: normalizedQuery,
          region: validRegion,
          language: validLanguage,
        });

        return [];
      }

      /*
       * Segunda chamada: carrega estatísticas dos vídeos.
       */
      const videosResponse = await axios.get(
        'https://www.googleapis.com/youtube/v3/videos',
        {
          params: {
            key: apiKey,
            part: 'snippet,statistics',
            id: videoIds.join(','),
            maxResults: limit,
          },
          timeout: 15_000,
        },
      );

      const items: any[] = Array.isArray(
        videosResponse.data?.items,
      )
        ? videosResponse.data.items
        : [];

      console.log(
        `✅ YouTube retornou ${items.length} vídeos virais.`,
      );

      return items
        .filter(
          (item) =>
            typeof item.id === 'string' &&
            item.id.length > 0,
        )
        .map((item): ViralVideo => {
          const snippet = item.snippet ?? {};
          const statistics = item.statistics ?? {};

          const tags: string[] = Array.isArray(snippet.tags)
            ? snippet.tags.filter(
                (tag: unknown): tag is string =>
                  typeof tag === 'string',
              )
            : [];

          const publishedAt =
            typeof snippet.publishedAt === 'string' &&
            !Number.isNaN(
              new Date(snippet.publishedAt).getTime(),
            )
              ? new Date(snippet.publishedAt)
              : new Date();

          return {
            externalId: item.id,
            platform: 'YOUTUBE',
            title: snippet.title ?? '',
            description:
              typeof snippet.description === 'string'
                ? snippet.description.slice(0, 500)
                : undefined,
            channel: snippet.channelTitle,
            url: `https://www.youtube.com/watch?v=${item.id}`,
            thumbnailUrl:
              snippet.thumbnails?.high?.url ??
              snippet.thumbnails?.medium?.url ??
              snippet.thumbnails?.default?.url,
            views: Number(statistics.viewCount ?? 0),
            likes: Number(statistics.likeCount ?? 0),
            comments: Number(statistics.commentCount ?? 0),
            publishedAt,
            language:
              snippet.defaultAudioLanguage ??
              snippet.defaultLanguage ??
              validLanguage ??
              language,
            region: validRegion ?? region,
            tags,
            raw: item,
          };
        });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('❌ YouTube viral API error:', {
          status: error.response?.status,
          message: error.message,
          response: error.response?.data,
          query: normalizedQuery,
          region: validRegion,
          language: validLanguage,
        });
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
   * TikTok Creative Center — hashtags em alta.
   */
  async fromTikTok(
    query: string,
    region: string,
    language: string,
    maxResults: number,
  ): Promise<ViralVideo[]> {
    const regionCode = region.toUpperCase();

    const url =
      `https://ads.tiktok.com/business/creativecenter/api/v1/` +
      `popular_trending/hashtags/list?region=${regionCode}` +
      `&page=1&limit=${maxResults}`;

    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; ViralForgeAI/1.0)',
          Accept: 'application/json',
        },
        timeout: 15_000,
      });

      const list: any[] =
        data?.data?.list ?? data?.list ?? [];

      const normalizedQuery = query
        .trim()
        .toLowerCase();

      const filtered = normalizedQuery
        ? list.filter((item) => {
            const name = String(
              item.hashtag_name ?? item.name ?? '',
            ).toLowerCase();

            return name.includes(normalizedQuery);
          })
        : list;

      return filtered
        .slice(0, maxResults)
        .map((item: any): ViralVideo => {
          const name = String(
            item.hashtag_name ?? item.name ?? '',
          );

          return {
            externalId: String(
              item.hashtag_id ?? name,
            ),
            platform: 'TIKTOK',
            title: `#${name}`,
            url: `https://www.tiktok.com/tag/${encodeURIComponent(
              name,
            )}`,
            views: Number(
              item.video_views ?? item.views ?? 0,
            ),
            publishedAt: new Date(),
            language,
            region: regionCode,
            tags: name ? [name] : [],
            raw: item,
          };
        });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('❌ TikTok API error:', {
          status: error.response?.status,
          message: error.message,
          response: error.response?.data,
        });
      }

      return [];
    }
  }

  /**
   * Reddit — top posts com vídeo.
   */
  async fromReddit(
    query: string,
    language: string,
    maxResults: number,
  ): Promise<ViralVideo[]> {
    try {
      const token = await this.getRedditToken();

      if (!token) {
        console.warn(
          '⚠️ Credenciais do Reddit não configuradas.',
        );
        return [];
      }

      const url = query.trim()
        ? `https://oauth.reddit.com/search?q=${encodeURIComponent(
            query.trim(),
          )}&sort=top&t=month&limit=${maxResults}`
        : `https://oauth.reddit.com/r/all/top?t=week&limit=${maxResults}`;

      const { data } = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': env.REDDIT_USER_AGENT,
        },
        timeout: 15_000,
      });

      const children: any[] =
        data?.data?.children ?? [];

      return children
        .map((child): ViralVideo | null => {
          const item = child.data;

          const destination = String(
            item.url_overridden_by_dest ?? '',
          );

          const isVideo =
            item.is_video === true ||
            /reddit\.com\/video|v\.redd\.it|\.mp4/i.test(
              destination,
            );

          if (!isVideo) {
            return null;
          }

          return {
            externalId: item.id,
            platform: 'REDDIT',
            title: item.title ?? '',
            description:
              typeof item.selftext === 'string'
                ? item.selftext.slice(0, 300)
                : undefined,
            channel: item.subreddit,
            url:
              destination ||
              `https://reddit.com${item.permalink}`,
            views: Number(
              item.view_count ?? item.score ?? 0,
            ),
            likes: Number(item.ups ?? 0),
            comments: Number(item.num_comments ?? 0),
            publishedAt: new Date(
              Number(item.created_utc ?? 0) * 1000,
            ),
            language,
            tags: item.subreddit
              ? [String(item.subreddit)]
              : [],
            raw: item,
          };
        })
        .filter(
          (item): item is ViralVideo =>
            item !== null,
        );
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('❌ Reddit API error:', {
          status: error.response?.status,
          message: error.message,
          response: error.response?.data,
        });
      }

      return [];
    }
  }

  private redditToken: {
    token: string;
    expiresAt: number;
  } | null = null;

  private async getRedditToken(): Promise<string | null> {
    if (
      !env.REDDIT_CLIENT_ID ||
      !env.REDDIT_CLIENT_SECRET
    ) {
      return null;
    }

    if (
      this.redditToken &&
      this.redditToken.expiresAt >
        Date.now() + 60_000
    ) {
      return this.redditToken.token;
    }

    try {
      const auth = Buffer.from(
        `${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`,
      ).toString('base64');

      const { data } = await axios.post(
        'https://www.reddit.com/api/v1/access_token',
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type':
              'application/x-www-form-urlencoded',
            'User-Agent': env.REDDIT_USER_AGENT,
          },
          timeout: 15_000,
        },
      );

      const token = String(data.access_token ?? '');
      const expiresIn = Number(data.expires_in ?? 3600);

      if (!token) {
        return null;
      }

      this.redditToken = {
        token,
        expiresAt:
          Date.now() + expiresIn * 1000,
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

export { cacheKey as viralCacheKey };
