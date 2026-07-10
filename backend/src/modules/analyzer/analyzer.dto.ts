import { z } from 'zod';

export const RunAnalyzerDto = z.object({
  searchId: z.string().uuid().optional(),
  recordId: z.string().uuid().optional(),
  recordIds: z.array(z.string().uuid()).optional(),
});
export type RunAnalyzerDto = z.infer<typeof RunAnalyzerDto>;

export const AnalyzerReportDto = z.object({
  searchId: z.string().uuid(),
  total: z.number().int().nonnegative(),
  bySource: z.record(z.string(), z.number().int()),
  avgOpportunity: z.number(),
  avgGrowth: z.number(),
  topOpportunities: z.array(
    z.object({
      recordId: z.string().uuid(),
      title: z.string(),
      opportunityScore: z.number(),
      growthPct: z.number(),
      source: z.string(),
    }),
  ),
  generatedAt: z.string(),
});
