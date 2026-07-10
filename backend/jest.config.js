import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import type { RawTrendItem, TrendSource } from './types.js';

/**
 * Google News RSS — feed RSS público.
 * Documentação: https://news.google.com/rss
 */
export class GoogleNewsSource implements TrendSource {
  readonly slug = 'GOOGLE_NEWS';
  private parser = new XMLParser({ ignoreAttributes: false });

  async fetch(query: string, options?: { region?: string; language?: string; limit?: number }): Promise<RawTrendItem[]> {
    const hl = options?.language || 'en';
    const gl = (options?.region || 'US').toUpperCase();
    const ceid = `${gl}:${hl}`;
    const q = encodeURIComponent(query || '');
    const url = query
      ? `https://news.google.com/rss/search?q=${q}&hl=${hl}&gl=${gl}&ceid=${ceid}`
      : `https://news.google.com/rss?hl=${hl}&gl=${gl}&ceid=${ceid}`;

    try {
      const { data } = await axios.get(url, { timeout: 15_000 });
      const json = this.parser.parse(data);
      const items: any[] = json?.rss?.channel?.item ?? [];
      const limit = options?.limit ?? 20;
      return items.slice(0, limit).map((it, idx) => ({
        externalId: it.guid || `${this.slug}:${idx}:${it.link}`,
        title: String(it.title ?? ''),
        url: it.link,
        publishedAt: it.pubDate ? new Date(it.pubDate) : new Date(),
        payload: {
          source: it.source,
          description: it.description,
          category: it.category,
        },
        language: hl,
        region: gl,
      }));
    } catch {
      return [];
    }
  }
}
