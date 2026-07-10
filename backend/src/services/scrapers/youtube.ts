import axios from 'axios';
import { env } from '../../config/env.js';
import type { RawTrendItem, TrendSource } from './types.js';

/**
 * YouTube Data API v3 — endpoint search.list + videos.list.
 * Documentação: https://developers.google.com/youtube/v3
 * Requer API Key (oficial).
 */
export class YouTubeSource implements TrendSource {
  readonly slug = 'YOUTUBE';

  async fetch(query: string, options?: { region?: string; language?: string; limit?: number }): Promise<RawTrendItem[]> {
    if (!env.YOUTUBE_API_KEY) return [];
    const limit = Math.min(options?.limit ?? 20, 50);
    const region = options?.region || 'US';
    const language = options?.language || 'en';
    try {
      const { data } = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          key: env.YOUTUBE_API_KEY,
          part: 'snippet',
          q: query || '',
          type: 'video',
          order: 'viewCount',
          maxResults: limit,
          regionCode: region,
          relevanceLanguage: language,
          publishedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        timeout: 15_000,
      });

      const items: any[] = data.items ?? [];
      return items.map((it) => ({
        externalId: it.id?.videoId,
        title: it.snippet?.title ?? '',
        url: it.id?.videoId ? `https://www.youtube.com/watch?v=${it.id.videoId}` : undefined,
        publishedAt: it.snippet?.publishedAt ? new Date(it.snippet.publishedAt) : new Date(),
        payload: {
          channelTitle: it.snippet?.channelTitle,
          description: it.snippet?.description,
          thumbnails: it.snippet?.thumbnails,
        },
        region,
        language,
      }));
    } catch {
      return [];
    }
  }
}
