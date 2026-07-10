import { Router } from 'express';
import { auth } from '../../shared/middlewares/auth.js';
import { validate } from '../../shared/middlewares/validate.js';
import { audit } from '../../shared/middlewares/audit.js';
import { AnalyzerController } from './analyzer.controller.js';
import { RunAnalyzerDto } from './analyzer.dto.js';

const c = new AnalyzerController();
export const analyzerRoutes: Router = Router();

/**
 * @swagger
 * /api/v1/analyzer/run:
 *   post:
 *     tags: [Analyzer]
 *     security: [{ bearerAuth: [] }]
 *     summary: Roda o analyzer para uma busca ou registros específicos
 */
analyzerRoutes.post('/run', auth, validate(RunAnalyzerDto), audit('analyzer.run', 'analyzer'), c.run);

/**
 * @swagger
 * /api/v1/analyzer/report/{searchId}:
 *   get:
 *     tags: [Analyzer]
 *     security: [{ bearerAuth: [] }]
 *     summary: Relatório agregado de uma busca
 */
analyzerRoutes.get('/report/:searchId', auth, c.report);
