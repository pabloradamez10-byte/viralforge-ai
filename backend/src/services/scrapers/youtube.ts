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
    if (!env.YOUTUBE_API_KEY?.trim()) {
      console.error('❌ YOUTUBE_API_KEY não configurada.');
      return [];
    }

    const limit = Math.min(
      Math.max(options?.limit ?? 20, 1),
      50,
    );

    const rawRegion = options?.region?.trim().toUpperCase() ?? '';
    const rawLanguage = options?.language?.trim().toLowerCase() ?? '';

    /*
     * O YouTube aceita regionCode com exatamente duas letras.
     * Valores como "global", "Brasil" ou "pt-BR" não são válidos.
     */
    const region =
      /^[A-Z]{2}$/.test(rawRegion) ? rawRegion : undefined;

    /*
     * relevanceLanguage usa código de idioma.
     * Converte "pt-BR" para "pt".
     */
    const languagePart = rawLanguage.split('-')[0];
    const language =
      /^[a-z]{2,3}$/.test(languagePart)
        ? languagePart
        : undefined;

    const params: Record<string, string | number> = {
      key: env.YOUTUBE_API_KEY.trim(),
      part: 'snippet',
      q: query.trim(),
      type: 'video',
      order: 'viewCount',
      maxResults: limit,
      publishedAfter: new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    };

    /*
     * Só envia esses parâmetros quando forem válidos.
     * Assim "global" não quebra a chamada.
     */
    if (region) {
      params.regionCode = region;
    }

    if (language) {
      params.relevanceLanguage = language;
    }

    console.log('YouTube request:', {
      query: query.trim(),
      regionReceived: options?.region,
      regionSent: region ?? 'omitted',
      languageReceived: options?.language,
      languageSent: language ?? 'omitted',
      limit,
    });

    try {
      const { data } = await axios.get(
        'https://www.googleapis.com/youtube/v3/search',
        {
          params,
          timeout: 15000,
        },
      );

      const items: any[] = Array.isArray(data?.items)
        ? data.items
        : [];

      console.log(`✅ YouTube retornou ${items.length} vídeos.`);

      return items.map((item) => ({
        externalId: item.id?.videoId,
        title: item.snippet?.title ?? '',
        url: item.id?.videoId
          ? `https://www.youtube.com/watch?v=${item.id.videoId}`
          : undefined,
        publishedAt: item.snippet?.publishedAt
          ? new Date(item.snippet.publishedAt)
          : new Date(),
        payload: {
          channelTitle: item.snippet?.channelTitle,
          description: item.snippet?.description,
          thumbnails: item.snippet?.thumbnails,
        },
        region: region ?? 'GLOBAL',
        language: language ?? 'en',
      }));
    } catch (error: any) {
      console.error('❌ YouTube API ERROR', {
        status: error?.response?.status,
        message: error?.message,
        response: error?.response?.data,
        regionReceived: options?.region,
        regionSent: region,
        languageReceived: options?.language,
        languageSent: language,
      });

      return [];
    }
  }
}
