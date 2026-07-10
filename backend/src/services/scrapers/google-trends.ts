import axios from 'axios';
import type { RawTrendItem, TrendSource } from './types.js';

/**
 * Google Trends — usa o endpoint público "daily trends" e "real time trends".
 * Estes são feeds RSS/JSON públicos do Google Trends.
 * Para dados de interesse por query específica, é recomendado SerpAPI (configurável).
 */
export class GoogleTrendsSource implements TrendSource {
  readonly slug = 'GOOGLE_TRENDS';

  async fetch(query: string, options?: { region?: string; language?: string; limit?: number }): Promise<RawTrendItem[]> {
    const geo = (options?.region || 'global').toLowerCase();
    const limit = options?.limit ?? 20;
    const url = `https://trends.google.com/trends/trendingsearches/daily?geo=${geo}`;

    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ViralForgeAI/1.0; +https://viralforge.ai/bot)',
          Accept: 'application/json, text/plain, */*',
        },
        timeout: 15_000,
      });

      // The endpoint returns a JSON array of objects like { title, traffic, articles: [{title,url,source}] }
      const arr: any[] = Array.isArray(data) ? data : [];
      const filtered = arr
        .filter((x) => !query || (x.title && new RegExp(query, 'i').test(String(x.title))))
        .slice(0, limit);

      return filtered.map((x, idx) => ({
        externalId: `${this.slug}:${geo}:${x.title ?? idx}`,
        title: String(x.title ?? '').trim(),
        url: x.articles?.[0]?.url,
        publishedAt: x.pubDate ? new Date(x.pubDate) : new Date(),
        payload: { traffic: x.traffic, articles: x.articles, related: x.relatedQueries },
        region: geo,
        language: options?.language || 'en',
        estimatedVolume: this.parseTraffic(x.traffic),
      }));
    } catch (err) {
      // Sem quebrar o pipeline; retorna vazio
      return [];
    }
  }

  private parseTraffic(traffic: string | number | undefined): number {
    if (!traffic) return 0;
    if (typeof traffic === 'number') return traffic;
    const m = String(traffic).match(/(\d+)/);
    if (!m || !m[1]) return 0;
    const n = parseInt(m[1], 10);
    if (/K/i.test(traffic)) return n * 1_000;
    if (/M/i.test(traffic)) return n * 1_000_000;
    return n;
  }
}
