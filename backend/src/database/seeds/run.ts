import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import { seedSources } from './sources.js';
import { seedCategories } from './categories.js';
import { seedAdmin } from './admin.js';

async function main() {
  logger.info('🌱 Seeding database…');
  await seedSources();
  await seedCategories();
  await seedAdmin();
  logger.info('✅ Seed completed');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    logger.error({ err }, 'Seed failed');
    await prisma.$disconnect();
    process.exit(1);
  });
