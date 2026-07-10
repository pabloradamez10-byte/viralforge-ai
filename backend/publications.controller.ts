import { Router } from 'express';
import { auth } from '../../shared/middlewares/auth.js';
import { validate } from '../../shared/middlewares/validate.js';
import { audit } from '../../shared/middlewares/audit.js';
import { FacelessController } from './faceless.controller.js';
import { GenerateFacelessDto } from './faceless.dto.js';

const c = new FacelessController();
export const facelessRoutes: Router = Router();

/**
 * @swagger
 * /api/v1/faceless/generate:
 *   post:
 *     tags: [Faceless]
 *     security: [{ bearerAuth: [] }]
 *     summary: Gera roteiro faceless ORIGINAL em PT-BR a partir de um vídeo de referência
 *     description: |
 *       Recebe o ID/título do vídeo viral (YouTube/TikTok/Reddit) APENAS como
 *       referência semântica. O roteiro gerado é totalmente ORIGINAL. Nenhum
 *       download, nenhuma cópia.
 */
facelessRoutes.post(
  '/generate',
  auth,
  validate(GenerateFacelessDto),
  audit('faceless.generate', 'faceless'),
  c.generate,
);

/**
 * @swagger
 * /api/v1/faceless:
 *   get:
 *     tags: [Faceless]
 *     security: [{ bearerAuth: [] }]
 *     summary: Lista roteiros faceless do usuário
 */
facelessRoutes.get('/', auth, c.list);

/**
 * @swagger
 * /api/v1/faceless/{id}:
 *   get:
 *     tags: [Faceless]
 *     security: [{ bearerAuth: [] }]
 *     summary: Detalhe de um roteiro
 */
facelessRoutes.get('/:id', auth, c.get);

/**
 * @swagger
 * /api/v1/faceless/{id}:
 *   delete:
 *     tags: [Faceless]
 *     security: [{ bearerAuth: [] }]
 *     summary: Remove um roteiro
 */
facelessRoutes.delete('/:id', auth, c.remove);
