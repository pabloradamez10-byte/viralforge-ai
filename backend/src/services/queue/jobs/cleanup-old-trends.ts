import { prisma } from '../../../config/prisma.js';
import { logger } from '../../../config/logger.js';

async function main() {
  const days = parseInt(process.argv.find((a) => a.startsWith('--days='))?.split('=')[1] || '365', 10);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const { count } = await prisma.trendRecord.deleteMany({ where: { collectedAt: { lt: cutoff } } });
  logger.info({ count, cutoff }, 'Cleanup done');
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, 'Cleanup failed');
  process.exit(1);
});
