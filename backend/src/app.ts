import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';

import { corsOrigins, env } from './config/env.js';
import { logger } from './config/logger.js';
import { swaggerSpec } from './config/swagger.js';

import { globalRateLimit } from './shared/middlewares/rate-limit.js';
import { requestId } from './shared/middlewares/request-id.js';
import {
  errorHandler,
  notFoundHandler,
} from './shared/middlewares/error-handler.js';

import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { projectsRoutes } from './modules/projects/projects.routes.js';
import { trendsRoutes } from './modules/trends/trends.routes.js';
import { analyzerRoutes } from './modules/analyzer/analyzer.routes.js';
import { historyRoutes } from './modules/history/history.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { sourcesPublicRoutes } from './modules/api-keys/api-keys.routes.js';
import { viralVideosRoutes } from './modules/viral-videos/viral-videos.routes.js';
import { facelessRoutes } from './modules/faceless/faceless.routes.js';
import { publicationsRoutes } from './modules/publications/publications.routes.js';
import { videoRenderRoutes } from './modules/video-render/video-render.routes.js';

const DEPLOYED_FRONTEND_ORIGINS = [
  'https://viralforge-ai-five.vercel.app',
];

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/$/, '');
}

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestId);

  app.use(
    helmet({
      contentSecurityPolicy:
        env.NODE_ENV === 'production'
          ? undefined
          : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(compression());

  const allowedOrigins = new Set(
    [
      ...corsOrigins,
      env.APP_URL,
      ...DEPLOYED_FRONTEND_ORIGINS,
    ]
      .filter(Boolean)
      .map(normalizeOrigin),
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }

        const normalizedOrigin = normalizeOrigin(origin);

        if (allowedOrigins.has(normalizedOrigin)) {
          return callback(null, true);
        }

        logger.warn(
          {
            origin: normalizedOrigin,
            allowedOrigins: [...allowedOrigins],
          },
          'CORS origin rejected',
        );

        return callback(new Error('CORS not allowed'));
      },
      credentials: true,
    }),
  );

  app.use(
    express.json({
      limit: '1mb',
    }),
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: '1mb',
    }),
  );

  app.use(globalRateLimit);

  // ── Logger ────────────────────────────────────────
  app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      logger.info(
        {
          requestId: req.id,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs:
            Date.now() - start,
          userId: req.userId,
        },
        'request',
      );
    });

    next();
  });

  // ── Health ────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'viralforge-backend',
      env: env.NODE_ENV,
      version: '1.0.0',
    });
  });

  app.get('/ready', async (_req, res) => {
    try {
      const { prisma } = await import(
        './config/prisma.js'
      );

      const { redis } = await import(
        './config/redis.js'
      );

      await Promise.all([
        prisma.$queryRaw`SELECT 1`,
        redis.ping(),
      ]);

      res.json({
        status: 'ready',
      });
    } catch (error) {
      res.status(503).json({
        status: 'not-ready',
        error:
          error instanceof Error
            ? error.message
            : 'Unknown readiness error',
      });
    }
  });

  // ── Docs ──────────────────────────────────────────
  app.get(
    '/api/docs-json',
    (_req, res) => {
      res.json(swaggerSpec);
    },
  );

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
    }),
  );

  // ── API v1 ────────────────────────────────────────
  const v1 = express.Router();

  v1.use('/auth', authRoutes);
  v1.use('/users', usersRoutes);
  v1.use('/projects', projectsRoutes);
  v1.use('/trends', trendsRoutes);
  v1.use('/analyzer', analyzerRoutes);
  v1.use('/history', historyRoutes);
  v1.use('/admin', adminRoutes);
  v1.use('/sources', sourcesPublicRoutes);
  v1.use('/viral-videos', viralVideosRoutes);
  v1.use('/faceless', facelessRoutes);
  v1.use('/publications', publicationsRoutes);

  /*
   * Rotas do gerador e renderizador:
   *
   * POST /api/v1/video-renders
   * GET  /api/v1/video-renders/:id
   * GET  /api/v1/video-renders/:id/download
   */
  v1.use(
    '/video-renders',
    videoRenderRoutes,
  );

  app.use('/api/v1', v1);

  // ── Root ──────────────────────────────────────────
  app.get('/', (_req, res) => {
    res.json({
      name: 'ViralForge AI',
      version: '1.0.0',
      docs: '/api/docs',
      health: '/health',
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
