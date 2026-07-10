import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';

/**
 * Seeds das fontes de dados. Cada fonte é uma "Source" no banco,
 * o que permite ligar API Keys por usuário e desativar dinamicamente.
 */
export const SEED_SOURCES = [
  {
    slug: 'GOOGLE_TRENDS',
    name: 'Google Trends',
    type: 'GOOGLE_TRENDS' as const,
    baseUrl: 'https://trends.google.com/trends/trendingsearches/daily',
    config: { refreshMinutes: 30, requiresKey: false, public: true },
  },
  {
    slug: 'YOUTUBE',
    name: 'YouTube Data API',
    type: 'YOUTUBE' as const,
    baseUrl: 'https://www.googleapis.com/youtube/v3',
    config: { refreshMinutes: 60, requiresKey: true, public: false },
  },
  {
    slug: 'REDDIT',
    name: 'Reddit API',
    type: 'REDDIT' as const,
    baseUrl: 'https://oauth.reddit.com',
    config: { refreshMinutes: 30, requiresKey: true, public: false },
  },
  {
    slug: 'TIKTOK',
    name: 'TikTok Creative Center',
    type: 'TIKTOK' as const,
    baseUrl: 'https://ads.tiktok.com/business/creativecenter',
    config: { refreshMinutes: 120, requiresKey: false, public: true, note: 'Dados públicos de inspiração' },
  },
  {
    slug: 'GOOGLE_NEWS',
    name: 'Google News RSS',
    type: 'GOOGLE_NEWS' as const,
    baseUrl: 'https://news.google.com/rss',
    config: { refreshMinutes: 15, requiresKey: false, public: true },
  },
  {
    slug: 'RSS',
    name: 'RSS Feeds',
    type: 'RSS' as const,
    baseUrl: null,
    config: {
      refreshMinutes: 30,
      requiresKey: false,
      public: true,
      feeds: [
        'https://feeds.bbci.co.uk/news/world/rss.xml',
        'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
        'https://www.theverge.com/rss/index.xml',
        'https://techcrunch.com/feed/',
      ],
    },
  },
  {
    slug: 'HACKERNEWS',
    name: 'Hacker News',
    type: 'HACKERNEWS' as const,
    baseUrl: 'https://hacker-news.firebaseio.com/v0',
    config: { refreshMinutes: 30, requiresKey: false, public: true },
  },
];

export async function seedSources() {
  for (const s of SEED_SOURCES) {
    await prisma.source.upsert({
      where: { slug: s.slug },
      create: s,
      update: { name: s.name, type: s.type, baseUrl: s.baseUrl, config: s.config },
    });
  }
  logger.info({ count: SEED_SOURCES.length }, 'Sources seeded');
}
