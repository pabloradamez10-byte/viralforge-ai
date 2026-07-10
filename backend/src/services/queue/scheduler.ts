import cron from 'node-cron';
import {
  trendsQueue,
  analyzerQueue,
  insightsQueue,
} from './queue.js';
import { logger } from '../../config/logger.js';

/**
 * Agendadores automáticos.
 *
 * Por padrão, ficam desativados para evitar consumo automático
 * de quota das APIs externas.
 *
 * Para ativar futuramente no Railway:
 *
 * ENABLE_AUTOMATIC_JOBS=true
 *
 * Também é possível controlar cada job separadamente:
 *
 * ENABLE_AUTOMATIC_TRENDS_COLLECTION=true
 * ENABLE_AUTOMATIC_ANALYZER=true
 * ENABLE_AUTOMATIC_INSIGHTS=true
 */
export function startSchedulers(): void {
  if (!isProduction()) {
    logger.info(
      'Automatic jobs skipped: application is not running in production',
    );
    return;
  }

  const automaticJobsEnabled = envBoolean(
    'ENABLE_AUTOMATIC_JOBS',
    false,
  );

  const trendsEnabled =
    automaticJobsEnabled &&
    envBoolean(
      'ENABLE_AUTOMATIC_TRENDS_COLLECTION',
      false,
    );

  const analyzerEnabled =
    automaticJobsEnabled &&
    envBoolean(
      'ENABLE_AUTOMATIC_ANALYZER',
      false,
    );

  const insightsEnabled =
    automaticJobsEnabled &&
    envBoolean(
      'ENABLE_AUTOMATIC_INSIGHTS',
      false,
    );

  if (!automaticJobsEnabled) {
    logger.info(
      'Automatic jobs are disabled. Manual searches remain available.',
    );
    return;
  }

  if (trendsEnabled) {
    cron.schedule('*/2 * * * *', async () => {
      try {
        await trendsQueue.add(
          'collect',
          {
            reason: 'scheduled',
          },
          {
            removeOnComplete: 50,
            removeOnFail: 50,
          },
        );

        logger.info(
          'Scheduled trends collection job enqueued',
        );
      } catch (err) {
        logger.error(
          { err },
          'Failed to enqueue collect job',
        );
      }
    });

    logger.info(
      'Automatic trends collection enabled: every 2 minutes',
    );
  } else {
    logger.info(
      'Automatic trends collection is disabled',
    );
  }

  if (analyzerEnabled) {
    cron.schedule('*/5 * * * *', async () => {
      try {
        await analyzerQueue.add(
          'analyze',
          {},
          {
            removeOnComplete: 50,
            removeOnFail: 50,
          },
        );

        logger.info(
          'Scheduled analyzer job enqueued',
        );
      } catch (err) {
        logger.error(
          { err },
          'Failed to enqueue analyze job',
        );
      }
    });

    logger.info(
      'Automatic analyzer enabled: every 5 minutes',
    );
  } else {
    logger.info(
      'Automatic analyzer is disabled',
    );
  }

  if (insightsEnabled) {
    cron.schedule('*/10 * * * *', async () => {
      try {
        await insightsQueue.add(
          'generate',
          {},
          {
            removeOnComplete: 50,
            removeOnFail: 50,
          },
        );

        logger.info(
          'Scheduled insights job enqueued',
        );
      } catch (err) {
        logger.error(
          { err },
          'Failed to enqueue insights job',
        );
      }
    });

    logger.info(
      'Automatic insights enabled: every 10 minutes',
    );
  } else {
    logger.info(
      'Automatic insights generation is disabled',
    );
  }
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function envBoolean(
  name: string,
  defaultValue: boolean,
): boolean {
  const value = process.env[name];

  if (value === undefined) {
    return defaultValue;
  }

  return value.trim().toLowerCase() === 'true';
}
