import { prisma } from '../../config/prisma.js';

export class HistoryRepository {
  listSearches(userId: string, since: Date, source?: string, projectId?: string, skip = 0, take = 20) {
    return prisma.trendSearch.findMany({
      where: {
        userId,
        createdAt: { gte: since },
        ...(projectId ? { projectId } : {}),
        ...(source ? { records: { some: { source: { slug: source } } } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        _count: { select: { records: true } },
        records: { include: { source: true, metrics: { orderBy: { snapshotDate: 'desc' }, take: 1 } } },
      },
    });
  }

  countSearches(userId: string, since: Date, source?: string, projectId?: string) {
    return prisma.trendSearch.count({
      where: {
        userId,
        createdAt: { gte: since },
        ...(projectId ? { projectId } : {}),
        ...(source ? { records: { some: { source: { slug: source } } } } : {}),
      },
    });
  }

  getSearch(userId: string, id: string) {
    return prisma.trendSearch.findFirst({
      where: { id, userId },
      include: {
        records: { include: { source: true, metrics: { orderBy: { snapshotDate: 'asc' } } } },
      },
    });
  }

  /**
   * Agrega métricas por source em janelas temporais para comparação.
   * Retorna { current: {...}, previous: {...} } com totals, médias e top trends.
   */
  async compare(userId: string, range: '7d' | '30d' | '90d' | '12m', source?: string) {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    const now = new Date();
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

    const baseWhere = (start: Date) => ({
      userId,
      collectedAt: { gte: start },
      ...(source ? { source: { slug: source } } : {}),
    });

    const [currentAgg, previousAgg] = await Promise.all([
      aggregate(baseWhere(currentStart)),
      aggregate(baseWhere(previousStart)),
    ]);

    return { range, current: currentAgg, previous: previousAgg };
  }
}

async function aggregate(where: any) {
  const records = await prisma.trendRecord.findMany({
    where,
    include: { source: true, metrics: { orderBy: { snapshotDate: 'desc' }, take: 1 } },
  });
  const bySource: Record<string, { count: number; avgOpp: number; avgGrowth: number; totalVolume: number }> = {};
  let total = 0;
  let sumOpp = 0;
  let sumGrowth = 0;
  let totalVolume = 0;

  for (const r of records) {
    total++;
    const m = r.metrics[0];
    const slug = r.source.slug;
    if (!bySource[slug]) bySource[slug] = { count: 0, avgOpp: 0, avgGrowth: 0, totalVolume: 0 };
    bySource[slug].count++;
    bySource[slug].totalVolume += m?.volume ?? 0;
    bySource[slug].avgOpp += m?.opportunityScore ?? 0;
    bySource[slug].avgGrowth += m?.growthPct ?? 0;
    if (m) {
      sumOpp += m.opportunityScore;
      sumGrowth += m.growthPct;
      totalVolume += m.volume;
    }
  }
  for (const k of Object.keys(bySource)) {
    const v = bySource[k]!;
    v.avgOpp = v.count ? Math.round((v.avgOpp / v.count) * 1000) / 1000 : 0;
    v.avgGrowth = v.count ? Math.round(v.avgGrowth / v.count) : 0;
  }
  return {
    total,
    bySource,
    avgOpportunity: total ? Math.round((sumOpp / total) * 1000) / 1000 : 0,
    avgGrowth: total ? Math.round(sumGrowth / total) : 0,
    totalVolume,
  };
}
