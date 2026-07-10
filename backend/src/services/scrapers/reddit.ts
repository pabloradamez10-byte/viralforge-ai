import axios from 'axios';
import { env } from '../../config/env.js';
import type { RawTrendItem, TrendSource } from './types.js';

/**
 * Reddit API — usa OAuth2 client credentials.
 * Documentação: https://www.reddit.com/dev/api/
 * Apenas posts públicos.
 */
export class RedditSource implements TrendSource {
  readonly slug = 'REDDIT';
  private tokenCache: { token: string; expiresAt: number } | null = null;

  private async getToken(): Promise<string | null> {
    if (!env.REDDIT_CLIENT_ID || !env.REDDIT_CLIENT_SECRET) return null;
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 60_000) {
      return this.tokenCache.token;
    }
    const auth = Buffer.from(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`).toString('base64');
    try {
      const { data } = await axios.post(
        'https://www.reddit.com/api/v1/access_token',
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': env.REDDIT_USER_AGENT,
          },
          timeout: 15_000,
        },
      );
      this.tokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };
      return this.tokenCache.token;
    } catch {
      return null;
    }
  }

  async fetch(query: string, options?: { region?: string; language?: string; limit?: number }): Promise<RawTrendItem[]> {
    const token = await this.getToken();
    if (!token) return [];
    const limit = Math.min(options?.limit ?? 25, 100);
    const url = query
      ? `https://oauth.reddit.com/search?q=${encodeURIComponent(query)}&sort=top&t=week&limit=${limit}`
      : `https://oauth.reddit.com/r/popular/hot?limit=${limit}`;
    try {
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}`, 'User-Agent': env.REDDIT_USER_AGENT },
        timeout: 15_000,
      });
      const children: any[] = data?.data?.children ?? [];
      return children.map((c) => {
        const d = c.data;
        return {
          externalId: d.id,
          title: d.title,
          url: d.url_overridden_by_dest || `https://reddit.com${d.permalink}`,
          publishedAt: new Date((d.created_utc ?? Date.now() / 1000) * 1000),
          payload: {
            subreddit: d.subreddit,
            score: d.score,
            num_comments: d.num_comments,
            author: d.author,
            selftext: d.selftext?.slice(0, 500),
          },
          language: options?.language || 'en',
        };
      });
    } catch {
      return [];
    }
  }
}
