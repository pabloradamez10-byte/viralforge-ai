import rateLimit from 'express-rate-limit';
import { redis } from '../../config/redis.js';
import { env } from '../../config/env.js';

const store = new (require('rate-limit-redis'))({
  sendCommand: (...args: string[]) => (redis as any).call(args[0], ...args.slice(1)),
  prefix: 'rl:',
});

export const globalRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.userId ? `u:${req.userId}` : `ip:${req.ip ?? 'unknown'}`),
  store,
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `ip:${req.ip ?? 'unknown'}`,
  store,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many auth attempts' } },
});
