import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../../config/redis.js';
import { env } from '../../config/env.js';

const sendCommand = redis.call.bind(redis) as unknown as (
  ...args: string[]
) => Promise<any>;

function createRedisStore(prefix: string): RedisStore {
  return new RedisStore({
    sendCommand,
    prefix,
  });
}

export const globalRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.userId ? `u:${req.userId}` : `ip:${req.ip ?? 'unknown'}`,
  store: createRedisStore('rl:global:'),
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `ip:${req.ip ?? 'unknown'}`,
  store: createRedisStore('rl:auth:'),
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many auth attempts',
    },
  },
});
