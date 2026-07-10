import { z } from 'zod';

/**
 * DTOs do módulo "Viral Videos".
 * Importante: estes vídeos são APENAS REFERÊNCIA. Nenhum download,
 * nenhuma redistribuição. Apenas metadados públicos via APIs oficiais.
 */

export const ListViralVideosDto = z.object({
  niche: z.string().min(1).max(80).optional(),
  platform: z.enum(['YOUTUBE', 'TIKTOK', 'REDDIT', 'ALL']).default('ALL'),
  region: z.string().min(2).max(8).default('BR'),
  language: z.string().min(2).max(8).default('pt'),
  minScore: z.coerce.number().min(0).max(100).default(60),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListViralVideosDto = z.infer<typeof ListViralVideosDto>;

export const SearchViralVideosDto = z.object({
  niche: z.string().min(2).max(80),
  platform: z.enum(['YOUTUBE', 'TIKTOK', 'REDDIT', 'ALL']).default('ALL'),
  region: z.string().min(2).max(8).default('BR'),
  language: z.string().min(2).max(8).default('pt'),
  maxResults: z.coerce.number().int().min(1).max(50).default(25),
});
export type SearchViralVideosDto = z.infer<typeof SearchViralVideosDto>;
