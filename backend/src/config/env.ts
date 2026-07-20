import 'dotenv/config';

import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z
    .enum([
      'development',
      'production',
      'test',
    ])
    .default('development'),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(4000),

  APP_NAME: z
    .string()
    .default('ViralForge AI'),

  APP_URL: z
    .string()
    .url()
    .default(
      'https://viralforge-ai-five.vercel.app',
    ),

  API_URL: z
    .string()
    .url()
    .default(
      'http://localhost:4000',
    ),

  LOG_LEVEL: z
    .enum([
      'fatal',
      'error',
      'warn',
      'info',
      'debug',
      'trace',
    ])
    .default('info'),

  JWT_SECRET: z
    .string()
    .min(16),

  JWT_REFRESH_SECRET: z
    .string()
    .min(16),

  JWT_ACCESS_TTL: z
    .string()
    .default('15m'),

  JWT_REFRESH_TTL: z
    .string()
    .default('30d'),

  ENCRYPTION_KEY: z
    .string()
    .min(32),

  BCRYPT_COST: z.coerce
    .number()
    .int()
    .min(4)
    .max(20)
    .default(12),

  DATABASE_URL: z
    .string()
    .min(1),

  REDIS_URL: z
    .string()
    .min(1),

  AI_PROVIDER: z
    .enum([
      'gemini',
      'groq',
      'openrouter',
      'openai',
      'anthropic',
      'ollama',
    ])
    .default('gemini'),

  GEMINI_API_KEY: z
    .string()
    .optional()
    .default(''),

  GEMINI_MODEL: z
    .string()
    .default(
      'gemini-2.5-flash',
    ),

  GROQ_API_KEY: z
    .string()
    .optional()
    .default(''),

  GROQ_MODEL: z
    .string()
    .default(
      'llama-3.3-70b-versatile',
    ),

  OPENROUTER_API_KEY: z
    .string()
    .optional()
    .default(''),

  OPENROUTER_MODEL: z
    .string()
    .default(
      'openrouter/free',
    ),

  OPENROUTER_SITE_URL: z
    .string()
    .url()
    .optional()
    .default(
      'https://viralforge-ai-five.vercel.app',
    ),

  OPENROUTER_APP_NAME: z
    .string()
    .default(
      'ViralForge AI',
    ),

  OPENAI_API_KEY: z
    .string()
    .optional()
    .default(''),

  OPENAI_MODEL: z
    .string()
    .default(
      'gpt-4o-mini',
    ),

  ANTHROPIC_API_KEY: z
    .string()
    .optional()
    .default(''),

  ANTHROPIC_MODEL: z
    .string()
    .default(
      'claude-3-5-sonnet-20241022',
    ),

  OLLAMA_BASE_URL: z
    .string()
    .url()
    .default(
      'http://localhost:11434',
    ),

  OLLAMA_MODEL: z
    .string()
    .default('llama3.1'),

  YOUTUBE_API_KEY: z
    .string()
    .optional()
    .default(''),

  PEXELS_API_KEY: z
    .string()
    .optional()
    .default(''),

  PIXABAY_API_KEY: z
    .string()
    .optional()
    .default(''),

  REDDIT_CLIENT_ID: z
    .string()
    .optional()
    .default(''),

  REDDIT_CLIENT_SECRET: z
    .string()
    .optional()
    .default(''),

  REDDIT_USER_AGENT: z
    .string()
    .default(
      'ViralForgeAI/1.0',
    ),

  SERPAPI_KEY: z
    .string()
    .optional()
    .default(''),

  ENABLE_CRON_JOBS: z.coerce
    .boolean()
    .default(false),

  ENABLE_TREND_JOBS: z.coerce
    .boolean()
    .default(false),

  ENABLE_PUBLICATION_JOBS: z.coerce
    .boolean()
    .default(false),

  ENABLE_ANALYSIS_JOBS: z.coerce
    .boolean()
    .default(false),

  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60_000),

  RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .positive()
    .default(120),

  CORS_ORIGINS: z
    .string()
    .default(
      'https://viralforge-ai-five.vercel.app,http://localhost:5173',
    ),
});

const parsed =
  schema.safeParse(
    process.env,
  );

if (!parsed.success) {
  console.error(
    '❌ Invalid environment variables:',
    parsed.error
      .flatten()
      .fieldErrors,
  );

  process.exit(1);
}

export const env =
  parsed.data;

export const corsOrigins = Array.from(
  new Set(
    [
      ...env.CORS_ORIGINS
        .split(',')
        .map((origin: string): string => origin.trim())
        .filter((origin: string): boolean => origin.length > 0),
      env.APP_URL,
    ],
  ),
);