/**
 * Analyzer service — re-roda métricas para uma busca ou conjunto de records.
 * Atualiza snapshots mais recentes com base em histórico real.
 */
import { AnalyzerRepository } from './analyzer.repository.js';
import { analyzeRecord } from './analyzer.service-impl.js';
import { prisma } from '../../config/prisma.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import type { RunAnalyzerDto } from './analyzer.dto.js';

export class AnalyzerService {
  constructor(private repo = new AnalyzerRepository()) {}

  async run(userId: string, dto: RunAnalyzerDto) {
    const where: any = {};
    if (dto.recordId) where.id = dto.recordId;
    else if (dto.recordIds?.length) where.id = { in: dto.recordIds };
    else if (dto.searchId) where.searchId = dto.searchId;
    else throw new NotFoundError('Provide searchId, recordId or recordIds');

    if (dto.searchId) {
      const search = await prisma.trendSearch.findFirst({ where: { id: dto.searchId, userId } });
      if (!search) throw new ForbiddenError();
    }

    const records = await this.repo.findRecordsToAnalyze(where);
    let updated = 0;
    for (const r of records) {
      const history = (r.metrics ?? []).map((m) => ({ snapshotDate: m.snapshotDate, volume: m.volume }));
      const computed = analyzeRecord({
        title: r.title,
        payload: r.payload as Record<string, unknown>,
        publishedAt: r.publishedAt ?? undefined,
        history,
      });

      const latest = r.metrics?.[r.metrics.length - 1];
      if (latest) {
        await this.repo.updateMetric(latest.id, {
          volume: computed.volume,
          growthPct: computed.growthPct,
          declinePct: computed.declinePct,
          competitionScore: computed.competitionScore,
          opportunityScore: computed.opportunityScore,
          seasonalityScore: computed.seasonalityScore,
          lifetimeDays: computed.lifetimeDays,
          popularity: computed.popularity,
          timeSeries: computed.timeSeries as any,
        });
      } else {
        await this.repo.createMetric({
          record: { connect: { id: r.id } },
          search: { connect: { id: r.searchId } },
          ...computed,
          timeSeries: computed.timeSeries as any,
        });
      }
      updated++;
    }
    return { updated, total: records.length };
  }

  async report(userId: string, searchId: string) {
    const search = await prisma.trendSearch.findFirst({
      where: { id: searchId, userId },
      include: {
        records: {
          include: { metrics: { orderBy: { snapshotDate: 'desc' }, take: 1 }, source: true },
        },
      },
    });
    if (!search) throw new NotFoundError('Search');

    const bySource: Record<string, number> = {};
    let total = 0;
    let sumOpp = 0;
    let sumGrowth = 0;
    const topOpportunities: Array<{ recordId: string; title: string; opportunityScore: number; growthPct: number; source: string }> = [];

    for (const r of search.records) {
      total++;
      const slug = r.source.slug;
      bySource[slug] = (bySource[slug] ?? 0) + 1;
      const m = r.metrics[0];
      if (m) {
        sumOpp += m.opportunityScore;
        sumGrowth += m.growthPct;
        topOpportunities.push({
          recordId: r.id,
          title: r.title,
          opportunityScore: m.opportunityScore,
          growthPct: m.growthPct,
          source: slug,
        });
      }
    }
    topOpportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);

    return {
      searchId,
      total,
      bySource,
      avgOpportunity: total ? Math.round((sumOpp / total) * 1000) / 1000 : 0,
      avgGrowth: total ? Math.round(sumGrowth / total) : 0,
      topOpportunities: topOpportunities.slice(0, 10),
      generatedAt: new Date().toISOString(),
    };
  }
}
