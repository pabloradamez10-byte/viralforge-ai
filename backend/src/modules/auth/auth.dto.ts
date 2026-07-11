import { z } from 'zod';

export const RegisterDto = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(2).max(80),
});

export type RegisterDto = z.infer<typeof RegisterDto>;

export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginDto = z.infer<typeof LoginDto>;

export const RefreshDto = z.object({
  refreshToken: z.string().min(20),
});

export type RefreshDto = z.infer<typeof RefreshDto>;

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'USER' | 'ADMIN';
    plan: 'FREE' | 'PRO' | 'AGENCY' | 'ENTERPRISE';
  };
  accessToken: string;
  refreshToken: string;
}
