import { Router } from 'express';
import { auth } from '../../shared/middlewares/auth.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { prisma } from '../../config/prisma.js';

export const sourcesPublicRoutes: Router = Router();

/**
 * @swagger
 * /api/v1/sources:
 *   get:
 *     tags: [Sources]
 *     security: [{ bearerAuth: [] }]
 *     summary: Lista fontes ativas (para o frontend)
 */
sourcesPublicRoutes.get(
  '/',
  auth,
  asyncHandler(async (_req, res) => {
    const sources = await prisma.source.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, slug: true, name: true, type: true, config: true, baseUrl: true },
    });
    res.json({ data: sources });
  }),
);
