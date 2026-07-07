import { redis } from '../../config/redis.js';

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  },

  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  async delPattern(pattern: string): Promise<void> {
    const stream = redis.scanStream({ match: pattern, count: 100 });
    for await (const keys of stream) {
      const arr = keys as string[];
      if (arr.length) await redis.del(arr);
    }
  },

  async wrap<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const hit = await this.get<T>(key);
    if (hit !== null) return hit;
    const fresh = await fn();
    await this.set(key, fresh, ttl);
    return fresh;
  },
};
