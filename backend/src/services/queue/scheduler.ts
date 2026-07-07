import cron from 'node-cron';
import { trendsQueue, analyzerQueue, insightsQueue } from './queue.js';
import { logger } from '../../config/logger.js';

/**
 * Scheduler em produção: registre os jobs periódicos.
 * Cada minuto, dispara uma coleta. Cada 5 min, análise. Cada 10 min, insights.
 */
export function startSchedulers() {
  if (env_production()) {
    cron.schedule('*/2 * * * *', async () => {
      try {
        await trendsQueue.add('collect', { reason: 'scheduled' }, { removeOnComplete: 50, removeOnFail: 50 });
      } catch (err) {
        logger.error({ err }, 'Failed to enqueue collect job');
      }
    });

    cron.schedule('*/5 * * * *', async () => {
      try {
        await analyzerQueue.add('analyze', {}, { removeOnComplete: 50 });
      } catch (err) {
        logger.error({ err }, 'Failed to enqueue analyze job');
      }
    });

    cron.schedule('*/10 * * * *', async () => {
      try {
        await insightsQueue.add('generate', {}, { removeOnComplete: 50 });
      } catch (err) {
        logger.error({ err }, 'Failed to enqueue insights job');
      }
    });
  }
}

function env_production() {
  return process.env.NODE_ENV === 'production';
}
