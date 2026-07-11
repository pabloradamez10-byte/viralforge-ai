import { Router } from 'express';

import { auth } from '../../shared/middlewares/auth.js';
import { audit } from '../../shared/middlewares/audit.js';

import { videoRenderController } from './video-render.controller.js';

export const videoRenderRoutes: Router = Router();

/**
 * @swagger
 * /api/v1/video-renders:
 *   post:
 *     tags: [Video Renders]
 *     security: [{ bearerAuth: [] }]
 *     summary: Inicia a geração de um vídeo faceless
 */
videoRenderRoutes.post(
  '/',
  auth,
  audit('video-render.create', 'video-render'),
  videoRenderController.create,
);

/**
 * @swagger
 * /api/v1/video-renders/{id}:
 *   get:
 *     tags: [Video Renders]
 *     security: [{ bearerAuth: [] }]
 *     summary: Consulta o andamento de uma renderização
 */
videoRenderRoutes.get(
  '/:id',
  auth,
  videoRenderController.status,
);

/**
 * @swagger
 * /api/v1/video-renders/{id}/download:
 *   get:
 *     tags: [Video Renders]
 *     security: [{ bearerAuth: [] }]
 *     summary: Baixa o vídeo finalizado
 */
videoRenderRoutes.get(
  '/:id/download',
  auth,
  audit('video-render.download', 'video-render'),
  videoRenderController.download,
);
