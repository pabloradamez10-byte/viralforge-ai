import type { TrendSource } from './types.js';
import { GoogleTrendsSource } from './google-trends.js';
import { YouTubeSource } from './youtube.js';
import { RedditSource } from './reddit.js';
import { GoogleNewsSource } from './google-news.js';
import { RssSource } from './rss.js';
import { HackerNewsSource } from './hackernews.js';
import { TikTokSource } from './tiktok.js';

export const sources: Record<string, TrendSource> = {
  GOOGLE_TRENDS: new GoogleTrendsSource(),
  YOUTUBE: new YouTubeSource(),
  REDDIT: new RedditSource(),
  GOOGLE_NEWS: new GoogleNewsSource(),
  RSS: new RssSource([
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
  ]),
  HACKERNEWS: new HackerNewsSource(),
  TIKTOK: new TikTokSource(),
};

export type { TrendSource, RawTrendItem } from './types.js';
