import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { validateProductionConfig } from './config/validate-production-config.js';
import { seedAdmin } from './database/seeds/admin.js';
import { startSchedulers } from './services/queue/scheduler.js';
import { startWorkers } from './services/queue/workers.js';

async function bootstrap() {
  validateProductionConfig();

  // Provisiona o administrador configurado no Railway de forma idempotente.
  // Se ADMIN_EMAIL/ADMIN_PASSWORD não existirem, o seed apenas registra e segue.
  // Se o usuário já existir, nenhuma alteração é feita.
  await seedAdmin();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, `🚀 ${env.APP_NAME} API running`);
    logger.info(`   Health: ${env.API_URL}/health`);
    logger.info(`   Swagger: ${env.API_URL}/api/docs`);
  });

  startWorkers();
  startSchedulers();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down…');
    server.close();
    const { prisma } = await import('./config/prisma.js');
    const { redis } = await import('./config/redis.js');
    await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Bootstrap failed');
  process.exit(1);
});