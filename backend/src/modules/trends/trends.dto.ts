import { z } from 'zod';

export const SearchTrendsDto = z.object({
  query: z.string().min(1).max(120),
  projectId: z.string().uuid().optional(),
  region: z.string().min(2).max(8).default('global'),
  language: z.string().min(2).max(8).default('en'),
  sources: z
    .array(
      z.enum([
        'GOOGLE_TRENDS',
        'YOUTUBE',
        'REDDIT',
        'TIKTOK',
        'GOOGLE_NEWS',
        'RSS',
        'HACKERNEWS',
      ]),
    )
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SearchTrendsDto = z.infer<typeof SearchTrendsDto>;

export const ListTrendsDto = z.object({
  projectId: z.string().uuid().optional(),
  source: z.string().optional(),
  sort: z.enum(['opportunity', 'growth', 'recent', 'volume']).default('opportunity'),
  range: z.enum(['24h', '7d', '30d', '90d']).default('7d'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListTrendsDto = z.infer<typeof ListTrendsDto>;
