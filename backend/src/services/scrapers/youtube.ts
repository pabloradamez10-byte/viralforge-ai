import axios from 'axios';
import { env } from '../../config/env.js';
import type { RawTrendItem, TrendSource } from './types.js';

/**
 * YouTube Data API v3 — search.list
 * Requer uma chave oficial em YOUTUBE_API_KEY.
 */
export class YouTubeSource implements TrendSource {
  readonly slug = 'YOUTUBE';

  async fetch(
    query: string,
    options?: {
      region?: string;
      language?: string;
      limit?: number;
    },
  ): Promise<RawTrendItem[]> {
    const apiKey = env.YOUTUBE_API_KEY.trim();

    if (!apiKey) {
      console.error('❌ YOUTUBE_API_KEY não configurada.');
      return [];
    }

    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      console.warn('⚠️ Busca do YouTube ignorada: consulta vazia.');
      return [];
    }

    const limit = Math.min(
      Math.max(options?.limit ?? 20, 1),
      50,
    );

    const rawRegion =
      options?.region?.trim().toUpperCase() ?? '';

    const rawLanguage =
      options?.language?.trim().toLowerCase() ?? '';

    /*
     * regionCode aceita códigos ISO 3166-1 alfa-2,
     * como BR, US, PT e GB.
     *
     * Valores como "global", "Brasil" e "pt-BR"
     * não devem ser enviados como região.
     */
    const region: string | undefined =
      /^[A-Z]{2}$/.test(rawRegion)
        ? rawRegion
        : undefined;

    /*
     * relevanceLanguage aceita um código de idioma.
     * Exemplos:
     * "pt-BR" vira "pt"
     * "en-US" vira "en"
     */
    const languagePart =
      rawLanguage.split('-')[0] ?? '';

    const language: string | undefined =
      /^[a-z]{2,3}$/.test(languagePart)
        ? languagePart
        : undefined;

    const publishedAfter = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const params: Record<string, string | number> = {
      key: apiKey,
      part: 'snippet',
      q: normalizedQuery,
      type: 'video',
      order: 'viewCount',
      maxResults: limit,
      publishedAfter,
    };

    /*
     * Esses parâmetros somente são enviados
     * quando forem válidos.
     */
    if (region !== undefined) {
      params.regionCode = region;
    }

    if (language !== undefined) {
      params.relevanceLanguage = language;
    }

    console.log('YouTube request:', {
      query: normalizedQuery,
      regionReceived: options?.region ?? null,
      regionSent: region ?? 'omitted',
      languageReceived: options?.language ?? null,
      languageSent: language ?? 'omitted',
      limit,
    });

    try {
      const response = await axios.get(
        'https://www.googleapis.com/youtube/v3/search',
        {
          params,
          timeout: 15_000,
        },
      );

      const data = response.data as {
        items?: Array<{
          id?: {
            videoId?: string;
          };
          snippet?: {
            title?: string;
            publishedAt?: string;
            channelTitle?: string;
            description?: string;
            thumbnails?: unknown;
          };
        }>;
      };

      const items = Array.isArray(data.items)
        ? data.items
        : [];

      console.log(
        `✅ YouTube retornou ${items.length} vídeos.`,
      );

      return items
        .filter((item) => Boolean(item.id?.videoId))
        .map((item): RawTrendItem => {
          const videoId = item.id?.videoId as string;
          const publishedAtValue =
            item.snippet?.publishedAt;

          const publishedAt =
            publishedAtValue &&
            !Number.isNaN(
              new Date(publishedAtValue).getTime(),
            )
              ? new Date(publishedAtValue)
              : new Date();

          return {
            externalId: videoId,
            title: item.snippet?.title ?? '',
            url: `https://www.youtube.com/watch?v=${videoId}`,
            publishedAt,
            payload: {
              channelTitle:
                item.snippet?.channelTitle ?? '',
              description:
                item.snippet?.description ?? '',
              thumbnails:
                item.snippet?.thumbnails ?? {},
            },
            region: region ?? 'GLOBAL',
            language: language ?? 'en',
          };
        });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('❌ YouTube API ERROR', {
          status: error.response?.status,
          message: error.message,
          response: error.response?.data,
          regionReceived: options?.region ?? null,
          regionSent: region ?? null,
          languageReceived:
            options?.language ?? null,
          languageSent: language ?? null,
        });
      } else {
        console.error(
          '❌ YouTube API ERROR desconhecido:',
          error,
        );
      }

      return [];
    }
  }
}
