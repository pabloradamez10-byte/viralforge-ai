import { Queue, Worker, type Processor, type ConnectionOptions } from 'bullmq';
import { env } from '../../config/env.js';

// BullMQ traz sua própria cópia de ioredis. Para evitar conflito de tipos,
// passamos as opções de conexão diretamente, sem instanciar ioredis.
const url = new URL(env.REDIS_URL);
const connection: ConnectionOptions = {
  host: url.hostname,
  port: Number(url.port || 6379),
  password: url.password || undefined,
  username: url.username || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
};

export const trendsQueue = new Queue('trends.collect', { connection });
export const analyzerQueue = new Queue('trends.analyze', { connection });
export const insightsQueue = new Queue('insights.generate', { connection });

export function createWorker<T>(name: string, processor: Processor<T>) {
  return new Worker<T>(name, processor, { connection });
}
