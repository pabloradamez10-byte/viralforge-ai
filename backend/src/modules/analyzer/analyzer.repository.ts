import { prisma } from '../../config/prisma.js';
import type { Prisma } from '@prisma/client';

export class AnalyzerRepository {
  findRecordsToAnalyze(filter: Prisma.TrendRecordWhereInput) {
    return prisma.trendRecord.findMany({
      where: filter,
      include: { metrics: { orderBy: { snapshotDate: 'asc' } }, source: true, search: true },
      take: 200,
    });
  }

  findSearchesWithResults(userId: string) {
    return prisma.trendSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        records: {
          include: { metrics: { orderBy: { snapshotDate: 'desc' }, take: 1 }, source: true },
        },
      },
    });
  }

  updateMetric(id: string, data: Prisma.TrendMetricUpdateInput) {
    return prisma.trendMetric.update({ where: { id }, data });
  }

  createMetric(data: Prisma.TrendMetricCreateInput) {
    return prisma.trendMetric.create({ data });
  }
}
