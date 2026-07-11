import { Router } from 'express';

import { auth } from '../../shared/middlewares/auth.js';
import { validate } from '../../shared/middlewares/validate.js';
import { audit } from '../../shared/middlewares/audit.js';

import { ViralVideosController } from './viral-videos.controller.js';
import { SearchViralVideosDto } from './viral-videos.dto.js';

const controller = new ViralVideosController();

export const viralVideosRoutes: Router = Router();

/**
 * @swagger
 * /api/v1/viral-videos:
 *   get:
 *     tags: [Viral Videos]
 *     security: [{ bearerAuth: [] }]
 *     summary: Lista vídeos virais
 */
viralVideosRoutes.get(
  '/',
  auth,
  controller.list,
);

/**
 * @swagger
 * /api/v1/viral-videos/search:
 *   post:
 *     tags: [Viral Videos]
 *     security: [{ bearerAuth: [] }]
 *     summary: Executa uma nova busca por vídeos virais
 */
viralVideosRoutes.post(
  '/search',
  auth,
  validate(SearchViralVideosDto),
  audit('viral.search', 'viral'),
  controller.search,
);
