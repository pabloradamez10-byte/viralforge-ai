import { Router } from 'express';
import { auth, requireRole } from '../../shared/middlewares/auth.js';
import { audit } from '../../shared/middlewares/audit.js';
import { prisma } from '../../config/prisma.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { trendsQueue } from '../../services/queue/queue.js';
import { z } from 'zod';
import { validate } from '../../shared/middlewares/validate.js';

const TriggerCollectDto = z.object({
  query: z.string().min(1).max(200),
  region: z.string().min(2).max(8).default('global'),
  language: z.string().min(2).max(8).default('en'),
  projectId: z.string().uuid().optional(),
});
type TriggerCollectDto = z.infer<typeof TriggerCollectDto>;

export const adminRoutes: Router = Router();

adminRoutes.use(auth, requireRole('ADMIN'));

/**
 * @swagger
 * /api/v1/admin/stats:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Estatísticas globais
 */
adminRoutes.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [users, projects, searches, records, insights, plans] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.trendSearch.count(),
      prisma.trendRecord.count(),
      prisma.insight.count(),
      prisma.contentPlan.count(),
    ]);
    res.json({
      data: {
        users,
        projects,
        searches,
        records,
        insights,
        plans,
        generatedAt: new Date().toISOString(),
      },
    });
  }),
);

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Lista usuários
 */
adminRoutes.get(
  '/users',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, email: true, name: true, role: true, plan: true, createdAt: true },
    });
    res.json({ data: users });
  }),
);

/**
 * @swagger
 * /api/v1/admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Lista logs de auditoria
 */
adminRoutes.get(
  '/audit-logs',
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Math.min(Number(req.query.pageSize ?? 50), 200);
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: { user: { select: { email: true, name: true } } },
      }),
      prisma.auditLog.count(),
    ]);
    res.json({ data: { items, total, page, pageSize } });
  }),
);

/**
 * @swagger
 * /api/v1/admin/sources:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Lista fontes registradas
 */
adminRoutes.get(
  '/sources',
  asyncHandler(async (_req, res) => {
    const sources = await prisma.source.findMany({ orderBy: { name: 'asc' } });
    res.json({ data: sources });
  }),
);

/**
 * @swagger
 * /api/v1/admin/sources/{id}/toggle:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Ativa/desativa fonte
 */
adminRoutes.patch(
  '/sources/:id/toggle',
  audit('admin.source.toggle', 'source'),
  asyncHandler(async (req, res) => {
    const src = await prisma.source.findUnique({ where: { id: req.params.id } });
    if (!src) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
    const updated = await prisma.source.update({
      where: { id: src.id },
      data: { active: !src.active },
    });
    res.json({ data: updated });
  }),
);

/**
 * @swagger
 * /api/v1/admin/trigger-collect:
 *   post:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Dispara uma coleta manual (enfileira job BullMQ)
 */
adminRoutes.post(
  '/trigger-collect',
  validate(TriggerCollectDto),
  audit('admin.trends.collect', 'trends'),
  asyncHandler(async (req, res) => {
    const dto = req.body as TriggerCollectDto;
    const job = await trendsQueue.add(
      'collect',
      { query: dto.query, region: dto.region, language: dto.language, projectId: dto.projectId },
      { removeOnComplete: 50, removeOnFail: 50 },
    );
    res.status(202).json({ data: { jobId: job.id, queued: true } });
  }),
);
