import Redis from 'ioredis';
import { env } from './env.js';

/**
 * Redis client para uso geral (cache, rate limit).
 * BullMQ usa o seu próprio client (em services/queue/queue.ts)
 * para evitar conflito entre versões de tipos do ioredis.
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redis.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Redis error:', err.message);
});
