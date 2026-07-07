import { z } from 'zod';

export const UpdateUserDto = z.object({
  name: z.string().min(2).max(80).optional(),
  avatarUrl: z.string().url().optional(),
  settings: z.record(z.unknown()).optional(),
});
export type UpdateUserDto = z.infer<typeof UpdateUserDto>;

export const ChangePasswordDto = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(72),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'New password must be different',
    path: ['newPassword'],
  });
export type ChangePasswordDto = z.infer<typeof ChangePasswordDto>;
