import { Router } from 'express';
import { auth } from '../../shared/middlewares/auth.js';
import { audit } from '../../shared/middlewares/audit.js';
import { PublicationsController } from './publications.controller.js';

const c = new PublicationsController();
export const publicationsRoutes: Router = Router();

/**
 * @swagger
 * /api/v1/publications/export:
 *   post:
 *     tags: [Publications]
 *     security: [{ bearerAuth: [] }]
 *     summary: Exporta o roteiro faceless em txt/json/srt/markdown
 */
publicationsRoutes.post(
  '/export',
  auth,
  audit('publications.export', 'publication'),
  c.export,
);

/**
 * @swagger
 * /api/v1/publications/prepare:
 *   post:
 *     tags: [Publications]
 *     security: [{ bearerAuth: [] }]
 *     summary: Prepara pacote de publicação (estrutura para APIs oficiais no futuro)
 */
publicationsRoutes.post(
  '/prepare',
  auth,
  audit('publications.prepare', 'publication'),
  c.prepare,
);
