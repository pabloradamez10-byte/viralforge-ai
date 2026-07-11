import { z } from 'zod';

export const RenderSceneDto = z.object({
  order: z.coerce.number().int().min(1),
  name: z.string().min(1).max(120),
  visual: z.string().min(1).max(1000),
  voiceover: z.string().min(1).max(3000),
  durationSec: z.coerce.number().min(1).max(60),
  searchKeywords: z
    .array(z.string().min(1).max(100))
    .max(10)
    .default([]),
});

export type RenderSceneDto = z.infer<
  typeof RenderSceneDto
>;

export const CreateVideoRenderDto = z.object({
  facelessScriptId: z.string().uuid(),

  title: z.string().min(1).max(200),

  narration: z.string().min(20).max(20000),

  scenes: z
    .array(RenderSceneDto)
    .min(1)
    .max(30),

  captions: z.string().max(20000).optional(),

  language: z.string().default('pt-BR'),

  voice: z
    .enum([
      'alloy',
      'ash',
      'coral',
      'echo',
      'fable',
      'nova',
      'onyx',
      'sage',
      'shimmer',
    ])
    .default('onyx'),

  format: z
    .enum(['vertical', 'horizontal', 'square'])
    .default('vertical'),

  resolution: z
    .enum(['720p', '1080p'])
    .default('1080p'),

  backgroundMusic: z.boolean().default(false),
});

export type CreateVideoRenderDto = z.infer<
  typeof CreateVideoRenderDto
>;

export const VideoRenderParamsDto = z.object({
  id: z.string().uuid(),
});

export type VideoRenderParamsDto = z.infer<
  typeof VideoRenderParamsDto
>;

export const VideoRenderStatus = z.enum([
  'PENDING',
  'GENERATING_AUDIO',
  'SEARCHING_MEDIA',
  'DOWNLOADING_MEDIA',
  'GENERATING_SUBTITLES',
  'RENDERING',
  'COMPLETED',
  'FAILED',
]);

export type VideoRenderStatus = z.infer<
  typeof VideoRenderStatus
>;

export interface VideoRenderResult {
  id: string;
  status: VideoRenderStatus;
  progress: number;
  message?: string;
  downloadUrl?: string;
  outputFilename?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}
