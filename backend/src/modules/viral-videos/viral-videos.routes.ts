import { Router } from 'express';
import { auth } from '../../shared/middlewares/auth.js';
import { validate } from '../../shared/middlewares/validate.js';
import { audit } from '../../shared/middlewares/audit.js';
import { ViralVideosController } from './viral-videos.controller.js';
import { SearchViralVideosDto } from './viral-videos.dto.js';

const c = new ViralVideosController();
export const viralVideosRoutes: Router = Router();

/**
 * @swagger
 * /api/v1/viral-videos:
 *   get:
 *     tags: [Viral Videos]
 *     security: [{ bearerAuth: [] }]
 *     summary: Lista vídeos virais (apenas referência — sem download)
 *     parameters:
 *       - in: query
 *         name: niche
 *         schema: { type: string }
 *       - in: query
 *         name: platform
 *         schema: { type: string, enum: [YOUTUBE, TIKTOK, REDDIT, ALL] }
 *       - in: query
 *         name: region
 *         schema: { type: string, default: BR }
 *       - in: query
 *         name: language
 *         schema: { type: string, default: pt }
 *       - in: query
 *         name: minScore
 *         schema: { type: integer, default: 60 }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
 */
viralVideosRoutes.get('/', auth, c.list);

/**
 * @swagger
 * /api/v1/viral-videos/search:
 *   post:
 *     tags: [Viral Videos]
 *     security: [{ bearerAuth: [] }]
 *     summary: Força uma busca nova por vídeos virais em um nicho
 */
viralVideosRoutes.post('/search', auth, validate(SearchViralVideosDto), audit('viral.search', 'viral'), c.search);
