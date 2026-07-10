import { HistoryRepository } from './history.repository.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import type { CompareHistoryDto, ListHistoryDto } from './history.dto.js';

export class HistoryService {
  constructor(private repo = new HistoryRepository()) {}

  async list(userId: string, dto: ListHistoryDto) {
    const since = rangeToDate(dto.range);
    const skip = (dto.page - 1) * dto.pageSize;
    const [items, total] = await Promise.all([
      this.repo.listSearches(userId, since, dto.source, dto.projectId, skip, dto.pageSize),
      this.repo.countSearches(userId, since, dto.source, dto.projectId),
    ]);
    return { items, total, page: dto.page, pageSize: dto.pageSize };
  }

  async get(userId: string, id: string) {
    const s = await this.repo.getSearch(userId, id);
    if (!s) throw new NotFoundError('History entry');
    return s;
  }

  compare(userId: string, dto: CompareHistoryDto) {
    return this.repo.compare(userId, dto.range, dto.source);
  }
}

function rangeToDate(range: '24h' | '7d' | '30d' | '90d' | '12m'): Date {
  const map = { '24h': 1, '7d': 7, '30d': 30, '90d': 90, '12m': 365 } as const;
  return new Date(Date.now() - map[range] * 24 * 60 * 60 * 1000);
}
