import Parser from 'rss-parser';
import type { RawTrendItem, TrendSource } from './types.js';

/**
 * RSS genérico. Aceita uma lista de feeds configurados por source.
 */
export class RssSource implements TrendSource {
  readonly slug = 'RSS';
  private parser = new Parser({ timeout: 15_000 });

  constructor(private feeds: string[] = []) {}

  async fetch(_query: string, options?: { limit?: number }): Promise<RawTrendItem[]> {
    const limit = options?.limit ?? 20;
    const items: RawTrendItem[] = [];
    for (const feed of this.feeds) {
      try {
        const parsed = await this.parser.parseURL(feed);
        for (const it of parsed.items.slice(0, limit)) {
          items.push({
            externalId: it.guid || it.link,
            title: it.title ?? '',
            url: it.link,
            publishedAt: it.pubDate ? new Date(it.pubDate) : new Date(),
            payload: { contentSnippet: it.contentSnippet, creator: it.creator, feed },
          });
        }
      } catch {
        // ignora feed inválido
      }
    }
    return items.slice(0, limit * 2);
  }
}
