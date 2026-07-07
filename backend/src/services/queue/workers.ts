import { createWorker } from './queue.js';
import { logger } from '../../config/logger.js';
import { collectAndPersist } from '../../modules/trends/collector.js';
import { prisma } from '../../config/prisma.js';
import { analyzeRecord } from '../../modules/analyzer/analyzer.service-impl.js';

interface CollectJobData {
  query?: string;
  region?: string;
  language?: string;
  projectId?: string;
}

interface AnalyzeJobData {
  reason?: string;
}

export function startWorkers() {
  // ── Worker: coleta de trends ──────────────────────────
  createWorker<CollectJobData>('trends.collect', async (job) => {
    const data: CollectJobData = job.data ?? {};
    const query = data.query ?? '';
    const region = data.region ?? 'global';
    const language = data.language ?? 'en';
    logger.info({ jobId: job.id, query }, 'trends.collect start');

    const sys = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const userId = sys?.id;

    const result = await collectAndPersist({
      userId,
      query,
      region,
      language,
      projectId: data.projectId,
      limit: 30,
    });
    logger.info({ jobId: job.id, ...result }, 'trends.collect done');
    return result;
  });

  // ── Worker: análise ──────────────────────────────────
  createWorker<AnalyzeJobData>('trends.analyze', async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const records = await prisma.trendRecord.findMany({
      where: { collectedAt: { gte: since } },
      include: { metrics: { orderBy: { snapshotDate: 'asc' } } },
      take: 500,
    });
    let updated = 0;
    for (const r of records) {
      const history = r.metrics.map((m) => ({ snapshotDate: m.snapshotDate, volume: m.volume }));
      const computed = analyzeRecord({
        title: r.title,
        payload: r.payload as Record<string, unknown>,
        publishedAt: r.publishedAt ?? undefined,
        history,
      });
      const latest = r.metrics[r.metrics.length - 1];
      if (latest) {
        await prisma.trendMetric.update({
          where: { id: latest.id },
          data: {
            volume: computed.volume,
            growthPct: computed.growthPct,
            declinePct: computed.declinePct,
            competitionScore: computed.competitionScore,
            opportunityScore: computed.opportunityScore,
            seasonalityScore: computed.seasonalityScore,
            lifetimeDays: computed.lifetimeDays,
            popularity: computed.popularity,
            timeSeries: computed.timeSeries as any,
          },
        });
        updated++;
      }
    }
    logger.info({ updated }, 'trends.analyze done');
    return { updated };
  });

  // ── Worker: insights placeholder ─────────────────────
  createWorker('insights.generate', async (job) => {
    logger.info({ jobId: job.id }, 'insights.generate tick');
    return { ok: true };
  });

  logger.info('Workers started: trends.collect, trends.analyze, insights.generate');
}
