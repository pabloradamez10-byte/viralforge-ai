import { z } from 'zod';

export const ListHistoryDto = z.object({
  range: z.enum(['24h', '7d', '30d', '90d', '12m']).default('30d'),
  source: z.string().optional(),
  projectId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListHistoryDto = z.infer<typeof ListHistoryDto>;

export const CompareHistoryDto = z.object({
  range: z.enum(['7d', '30d', '90d', '12m']).default('30d'),
  source: z.string().optional(),
  projectId: z.string().uuid().optional(),
});
export type CompareHistoryDto = z.infer<typeof CompareHistoryDto>;
