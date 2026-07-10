import { z } from 'zod';

export const ExportFacelessDto = z.object({
  scriptId: z.string().uuid(),
  format: z.enum(['txt', 'json', 'srt', 'markdown']).default('txt'),
});
export type ExportFacelessDto = z.infer<typeof ExportFacelessDto>;

export const PreparePublicationDto = z.object({
  scriptId: z.string().uuid(),
  target: z.enum(['YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'MANUAL']),
  scheduledAt: z.string().datetime().optional(),
  caption: z.string().max(2200).optional(),
  visibility: z.enum(['public', 'unlisted', 'private']).default('public'),
});
export type PreparePublicationDto = z.infer<typeof PreparePublicationDto>;
