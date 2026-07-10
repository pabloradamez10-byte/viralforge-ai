import { TrendsRepository } from './trends.repository.js';
import { collectAndPersist } from './collector.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import { cache } from '../../services/cache/cache.service.js';
import type { ListTrendsDto, SearchTrendsDto } from './trends.dto.js';

export class TrendsService {
  constructor(private repo = new TrendsRepository()) {}

  async search(userId: string, dto: SearchTrendsDto) {
    const result = await collectAndPersist({
      userId,
      query: dto.query,
      projectId: dto.projectId,
      region: dto.region,
      language: dto.language,
      sources: dto.sources,
      limit: dto.limit,
    });
    await cache.delPattern('trends:*');
    return result;
  }

  async list(userId: string, dto: ListTrendsDto) {
    const cacheKey = `trends:list:${userId}:${JSON.stringify(dto)}`;
    return cache.wrap(cacheKey, 60, async () => {
      const where: any = {
        search: { userId, ...(dto.projectId ? { projectId: dto.projectId } : {}) },
        ...(dto.source ? { source: { slug: dto.source } } : {}),
      };
      const orderBy =
        dto.sort === 'recent'
          ? { collectedAt: 'desc' as const }
          : { collectedAt: 'desc' as const };
      const skip = (dto.page - 1) * dto.pageSize;
      const [items, total] = await Promise.all([
        this.repo.findRecords(where, { take: dto.pageSize, skip, orderBy }),
        this.repo.countRecords(where),
      ]);

      // sort in-memory by metrics
      let sorted = items;
      if (dto.sort === 'opportunity') {
        sorted = items.sort(
          (a: any, b: any) =>
            (b.metrics?.[0]?.opportunityScore ?? 0) - (a.metrics?.[0]?.opportunityScore ?? 0),
        );
      } else if (dto.sort === 'growth') {
        sorted = items.sort(
          (a: any, b: any) => (b.metrics?.[0]?.growthPct ?? 0) - (a.metrics?.[0]?.growthPct ?? 0),
        );
      } else if (dto.sort === 'volume') {
        sorted = items.sort(
          (a: any, b: any) => (b.metrics?.[0]?.volume ?? 0) - (a.metrics?.[0]?.volume ?? 0),
        );
      }

      return { items: sorted, total, page: dto.page, pageSize: dto.pageSize };
    });
  }

  async top(range: '24h' | '7d' | '30d' | '90d' = '7d', limit = 10) {
    const cacheKey = `trends:top:${range}:${limit}`;
    return cache.wrap(cacheKey, 120, async () => {
      const items = await this.repo.getTopOpportunities(range, limit);
      return items
        .map((r: any) => ({
          ...r,
          score: r.metrics?.[0]?.opportunityScore ?? 0,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    });
  }

  async get(id: string) {
    const r = await this.repo.findRecordById(id);
    if (!r) throw new NotFoundError('Trend');
    return r;
  }

  async metrics(id: string) {
    const r = await this.repo.findRecordById(id);
    if (!r) throw new NotFoundError('Trend');
    return this.repo.findMetricsByRecord(id);
  }

  async listSearches(userId: string) {
    return this.repo.listSearches(userId);
  }
}
