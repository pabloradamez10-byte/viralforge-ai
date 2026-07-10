import { z } from 'zod';

export const CreateProjectDto = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  niche: z.string().max(80).optional(),
  settings: z.record(z.unknown()).optional(),
});
export type CreateProjectDto = z.infer<typeof CreateProjectDto>;

export const UpdateProjectDto = CreateProjectDto.partial();
export type UpdateProjectDto = z.infer<typeof UpdateProjectDto>;
