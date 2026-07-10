import { Router } from 'express';
import { auth } from '../../shared/middlewares/auth.js';
import { HistoryController } from './history.controller.js';

const c = new HistoryController();
export const historyRoutes: Router = Router();

/**
 * @swagger
 * /api/v1/history:
 *   get:
 *     tags: [History]
 *     security: [{ bearerAuth: [] }]
 *     summary: Lista o histórico de buscas
 *     parameters:
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [24h, 7d, 30d, 90d, 12m] }
 *       - in: query
 *         name: source
 *         schema: { type: string }
 *       - in: query
 *         name: projectId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
 */
historyRoutes.get('/', auth, c.list);

/**
 * @swagger
 * /api/v1/history/compare:
 *   get:
 *     tags: [History]
 *     security: [{ bearerAuth: [] }]
 *     summary: Compara janela atual vs anterior (7d, 30d, 90d, 12m)
 *     parameters:
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [7d, 30d, 90d, 12m] }
 *       - in: query
 *         name: source
 *         schema: { type: string }
 */
historyRoutes.get('/compare', auth, c.compare);

/**
 * @swagger
 * /api/v1/history/{id}:
 *   get:
 *     tags: [History]
 *     security: [{ bearerAuth: [] }]
 *     summary: Detalhe de uma busca histórica
 */
historyRoutes.get('/:id', auth, c.get);
