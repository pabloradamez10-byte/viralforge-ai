/**
 * Coleta de vídeos virais via APIs oficiais.
 *
 * - YouTube Data API v3: videos.list + search.list
 * - TikTok: dados públicos do Creative Center (apenas metadados)
 * - Reddit: top posts
 *
 * REGRA: Nenhum download. Apenas metadados (título, canal, views, link público).
 * Os vídeos são exibidos SOMENTE como referência para o usuário.
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

const cacheKey = (...parts: (string | number)[]) => `viral:${parts.join(':')}`;

export class ViralVideoSources {
  /**
   * Busca viral videos no YouTube via Data API v3 oficial.
   * Parâmetros: chart=mostPopular e/ou busca por query com order=viewCount.
   */
  async fromYouTube(query: string, region: string, language: string, maxResults: number): Promise<ViralVideo[]> {
    if (!env.YOUTUBE_API_KEY) return [];
    try {
      const params: Record<string, unknown> = {
        key: env.YOUTUBE_API_KEY,
        part: 'snippet,statistics',
        type: 'video',
        maxResults: Math.min(maxResults, 50),
        regionCode: region,
        relevanceLanguage: language,
      };
      if (query) {
        params.q = query;
        params.order = 'viewCount';
        params.publishedAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        params.chart = 'mostPopular';
        params.videoCategoryId = '0';
      }
      const { data } = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params,
        timeout: 15_000,
      });
      const items: any[] = data.items ?? [];
      return items
        .filter((it) => !!it.id)
        .map((it) => {
          const sn = it.snippet ?? {};
          const st = it.statistics ?? {};
          const tags: string[] = Array.isArray(sn.tags) ? sn.tags : [];
          return {
            externalId: it.id,
            platform: 'YOUTUBE' as const,
            title: sn.title ?? '',
            description: sn.description?.slice(0, 500),
            channel: sn.channelTitle,
            url: `https://www.youtube.com/watch?v=${it.id}`,
            thumbnailUrl: sn.thumbnails?.high?.url ?? sn.thumbnails?.default?.url,
            views: Number(st.viewCount ?? 0),
            likes: Number(st.likeCount ?? 0),
            comments: Number(st.commentCount ?? 0),
            publishedAt: sn.publishedAt ? new Date(sn.publishedAt) : new Date(),
            language: sn.defaultAudioLanguage ?? language,
            region,
            tags,
            raw: it,
          };
        });
    } catch (err) {
      return [];
    }
  }

  /**
   * TikTok Creative Center — hashtags em alta.
   * Apenas metadados públicos (hashtag, views estimados, link).
   */
  async fromTikTok(query: string, region: string, language: string, maxResults: number): Promise<ViralVideo[]> {
    const regionCode = region.toUpperCase();
    const url = `https://ads.tiktok.com/business/creativecenter/api/v1/popular_trending/hashtags/list?region=${regionCode}&page=1&limit=${maxResults}`;
    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ViralForgeAI/1.0; +https://viralforge.ai/bot)',
          Accept: 'application/json',
        },
        timeout: 15_000,
      });
      const list: any[] = data?.data?.list ?? data?.list ?? [];
      const filtered = query
        ? list.filter((x) => new RegExp(query, 'i').test(String(x.hashtag_name ?? x.name ?? '')))
        : list;
      return filtered.slice(0, maxResults).map((x: any) => ({
        externalId: String(x.hashtag_id ?? x.hashtag_name ?? x.name),
        platform: 'TIKTOK' as const,
        title: `#${x.hashtag_name ?? x.name}`,
        url: `https://www.tiktok.com/tag/${x.hashtag_name ?? x.name}`,
        views: Number(x.video_views ?? x.views ?? 0),
        publishedAt: new Date(),
        language,
        region: regionCode,
        tags: [String(x.hashtag_name ?? x.name)],
        raw: x,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Reddit — top posts com alta pontuação.
   */
  async fromReddit(query: string, language: string, maxResults: number): Promise<ViralVideo[]> {
    try {
      const token = await this.getRedditToken();
      if (!token) return [];
      const url = query
        ? `https://oauth.reddit.com/search?q=${encodeURIComponent(query)}&sort=top&t=month&limit=${maxResults}&restrict_sr=on`
        : `https://oauth.reddit.com/r/all/top?t=week&limit=${maxResults}`;
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}`, 'User-Agent': env.REDDIT_USER_AGENT },
        timeout: 15_000,
      });
      const children: any[] = data?.data?.children ?? [];
      return children.map((c) => {
        const d = c.data;
        const isVideo = d.is_video || /reddit\.com\/video|\.mp4/.test(d.url_overridden_by_dest ?? '');
        if (!isVideo) return null;
        return {
          externalId: d.id,
          platform: 'REDDIT' as const,
          title: d.title,
          description: d.selftext?.slice(0, 300),
          channel: d.subreddit,
          url: d.url_overridden_by_dest || `https://reddit.com${d.permalink}`,
          views: Number(d.view_count ?? d.score ?? 0),
          likes: Number(d.ups ?? 0),
          comments: Number(d.num_comments ?? 0),
          publishedAt: new Date((d.created_utc ?? Date.now() / 1000) * 1000),
          language,
          tags: [d.subreddit].filter(Boolean),
          raw: d,
        } as ViralVideo;
      }).filter(Boolean) as ViralVideo[];
    } catch {
      return [];
    }
  }

  private redditToken: { token: string; expiresAt: number } | null = null;
  private async getRedditToken(): Promise<string | null> {
    if (!env.REDDIT_CLIENT_ID || !env.REDDIT_CLIENT_SECRET) return null;
    if (this.redditToken && this.redditToken.expiresAt > Date.now() + 60_000) return this.redditToken.token;
    try {
      const auth = Buffer.from(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`).toString('base64');
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
      this.redditToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
      return this.redditToken.token;
    } catch {
      return null;
    }
  }
}

export const viralVideoSources = new ViralVideoSources();
export { cacheKey as viralCacheKey };
