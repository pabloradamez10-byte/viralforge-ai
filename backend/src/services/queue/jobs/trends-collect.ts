import { collectAndPersist } from '../../../modules/trends/collector.js';
import { logger } from '../../../config/logger.js';

async function main() {
  logger.info('Starting trends collection job');
  const result = await collectAndPersist({ query: '' });
  logger.info({ count: result.records }, 'Trends collected');
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, 'Trends collection job failed');
  process.exit(1);
});
