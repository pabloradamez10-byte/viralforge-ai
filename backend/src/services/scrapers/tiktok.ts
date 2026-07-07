import axios from 'axios';
import type { RawTrendItem, TrendSource } from './types.js';

/**
 * TikTok Creative Center — usa endpoints públicos de inspiração/hashtags.
 * Caso o endpoint esteja bloqueado, retorna vazio (fail-safe).
 * Sem scraping agressivo: respeita rate limit.
 */
export class TikTokSource implements TrendSource {
  readonly slug = 'TIKTOK';

  async fetch(query: string, options?: { region?: string; language?: string; limit?: number }): Promise<RawTrendItem[]> {
    const limit = options?.limit ?? 20;
    const region = (options?.region || 'BR').toUpperCase();
    const urls = [
      `https://ads.tiktok.com/business/creativecenter/api/v1/popular_trending/hashtags/list?region=${region}&page=1&limit=${limit}`,
    ];
    for (const url of urls) {
      try {
        const { data } = await axios.get(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; ViralForgeAI/1.0; +https://viralforge.ai/bot)',
            Accept: 'application/json',
          },
          timeout: 15_000,
        });
        const arr: any[] = data?.data?.list ?? data?.list ?? [];
        const filtered = arr
          .filter((x) => !query || new RegExp(query, 'i').test(String(x.hashtag_name ?? x.name ?? '')))
          .slice(0, limit);
        if (filtered.length) {
          return filtered.map((x: any) => ({
            externalId: String(x.hashtag_id ?? x.id ?? x.hashtag_name),
            title: `#${x.hashtag_name ?? x.name}`,
            url: x.link || `https://www.tiktok.com/tag/${x.hashtag_name ?? x.name}`,
            publishedAt: new Date(),
            payload: {
              views: x.video_views ?? x.views,
              rank: x.rank,
              country: region,
            },
            region,
            language: options?.language || 'pt',
            estimatedVolume: x.video_views ?? x.views,
          }));
        }
      } catch {
        // tenta próximo
      }
    }
    return [];
  }
}
