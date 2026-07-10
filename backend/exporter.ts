import { z } from 'zod';

export const GenerateFacelessDto = z.object({
  sourceVideoId: z.string().min(1), // id do viral video (não baixado, só referência)
  sourcePlatform: z.enum(['YOUTUBE', 'TIKTOK', 'REDDIT']),
  sourceTitle: z.string().min(2).max(280),
  sourceDescription: z.string().max(2000).optional(),
  sourceTags: z.array(z.string()).max(30).optional(),
  niche: z.string().min(2).max(80).optional(),
  language: z.string().min(2).max(8).default('pt-BR'),
  targetDuration: z.enum(['short', 'medium', 'long']).default('short'),
  tone: z.enum(['curioso', 'educativo', 'polêmico', 'storytelling', 'humor']).default('curioso'),
  projectId: z.string().uuid().optional(),
});
export type GenerateFacelessDto = z.infer<typeof GenerateFacelessDto>;

export const FacelessScriptSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().max(120),
  hook: z.string().max(280),
  narration: z.string(),
  scenes: z.array(
    z.object({
      order: z.number().int().min(1),
      name: z.string(),
      visual: z.string(),
      voiceover: z.string(),
      durationSec: z.number().int().min(1).max(120),
    }),
  ),
  captions: z.string(), // SRT-like texto com timestamps
  hashtags: z.array(z.string()),
  cta: z.string().max(280),
  keywords: z.array(z.string()),
  thumbnailSuggestion: z.string().max(280),
  estimatedDurationSec: z.number().int(),
  language: z.string(),
  createdAt: z.string().optional(),
});
export type FacelessScript = z.infer<typeof FacelessScriptSchema>;
