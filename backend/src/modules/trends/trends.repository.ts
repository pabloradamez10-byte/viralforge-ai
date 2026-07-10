import { prisma } from '../../config/prisma.js';
import type { Prisma } from '@prisma/client';

export class TrendsRepository {
  createSearch(userId: string, data: { query: string; region: string; language: string; filters: any; projectId?: string }) {
    return prisma.trendSearch.create({
      data: {
        userId,
        projectId: data.projectId,
        query: data.query,
        region: data.region,
        language: data.language,
        filters: data.filters,
      },
    });
  }
  createRecord(data: Prisma.TrendRecordCreateInput) {
    return prisma.trendRecord.create({ data });
  }
  createMetric(data: Prisma.TrendMetricCreateInput) {
    return prisma.trendMetric.create({ data });
  }
  findRecords(filter: Prisma.TrendRecordWhereInput, opts: { take: number; skip: number; orderBy: Prisma.TrendRecordOrderByWithRelationInput }) {
    return prisma.trendRecord.findMany({ where: filter, take: opts.take, skip: opts.skip, orderBy: opts.orderBy, include: { source: true, category: true, metrics: { orderBy: { snapshotDate: 'desc' }, take: 1 } } });
  }
  countRecords(filter: Prisma.TrendRecordWhereInput) {
    return prisma.trendRecord.count({ where: filter });
  }
  findRecordById(id: string) {
    return prisma.trendRecord.findUnique({
      where: { id },
      include: { source: true, category: true, metrics: { orderBy: { snapshotDate: 'desc' }, take: 30 }, search: true },
    });
  }
  findMetricsByRecord(recordId: string) {
    return prisma.trendMetric.findMany({ where: { recordId }, orderBy: { snapshotDate: 'asc' } });
  }
  listSources() {
    return prisma.source.findMany({ where: { active: true } });
  }
  findSource(slug: string) {
    return prisma.source.findUnique({ where: { slug } });
  }
  listSearches(userId: string, take = 50) {
    return prisma.trendSearch.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take, include: { _count: { select: { records: true } } } });
  }
  getTopOpportunities(range: '24h' | '7d' | '30d' | '90d', limit = 10) {
    const since = rangeDate(range);
    return prisma.trendRecord.findMany({
      where: { collectedAt: { gte: since } },
      include: { metrics: { orderBy: { snapshotDate: 'desc' }, take: 1 }, source: true },
      take: limit * 3,
    });
  }
}

function rangeDate(range: '24h' | '7d' | '30d' | '90d'): Date {
  const map = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 } as const;
  return new Date(Date.now() - map[range] * 24 * 60 * 60 * 1000);
}
