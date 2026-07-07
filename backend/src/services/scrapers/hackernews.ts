import axios from 'axios';
import type { RawTrendItem, TrendSource } from './types.js';

/**
 * Hacker News — API pública.
 * Documentação: https://github.com/HackerNews/API
 */
export class HackerNewsSource implements TrendSource {
  readonly slug = 'HACKERNEWS';

  async fetch(query: string, options?: { limit?: number }): Promise<RawTrendItem[]> {
    const limit = options?.limit ?? 30;
    try {
      const { data: ids } = await axios.get<number[]>(
        'https://hacker-news.firebaseio.com/v0/topstories.json',
        { timeout: 15_000 },
      );
      const slice = ids.slice(0, limit);
      const results = await Promise.allSettled(
        slice.map((id) =>
          axios
            .get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { timeout: 10_000 })
            .then((r) => r.data),
        ),
      );
      const items: RawTrendItem[] = [];
      for (const r of results) {
        if (r.status !== 'fulfilled' || !r.value) continue;
        const it = r.value;
        if (query && !new RegExp(query, 'i').test(`${it.title ?? ''}`)) continue;
        items.push({
          externalId: String(it.id),
          title: it.title ?? '(sem título)',
          url: it.url || `https://news.ycombinator.com/item?id=${it.id}`,
          publishedAt: it.time ? new Date(it.time * 1000) : new Date(),
          payload: { score: it.score, descendants: it.descendants, by: it.by },
        });
      }
      return items;
    } catch {
      return [];
    }
  }
}
