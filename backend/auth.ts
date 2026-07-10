import { cache } from '../../services/cache/cache.service.js';
import { viralVideoSources, type ViralVideo } from './sources.js';
import { computeViralScore } from './scorer.js';
import type { ListViralVideosDto, SearchViralVideosDto } from './viral-videos.dto.js';

export interface ScoredViralVideo extends ViralVideo {
  score: number;
}

export class ViralVideosService {
  /**
   * Lista vídeos virais (cacheado 10min) com base em filtros.
   * Quando a chave de API não está configurada, retorna [].
   */
  async list(dto: ListViralVideosDto): Promise<{ items: ScoredViralVideo[]; total: number; page: number; pageSize: number; sourcesUsed: string[] }> {
    const key = `viral:list:${JSON.stringify(dto)}`;
    return cache.wrap(key, 600, async () => {
      const items = await this.searchAcrossSources({
        niche: dto.niche,
        platform: dto.platform,
        region: dto.region,
        language: dto.language,
        maxResults: dto.pageSize * 2,
      });
      const scored = items
        .map((v) => ({ ...v, score: computeViralScore(v) }))
        .filter((v) => v.score >= dto.minScore)
        .sort((a, b) => b.score - a.score);

      const start = (dto.page - 1) * dto.pageSize;
      const paged = scored.slice(start, start + dto.pageSize);

      const sourcesUsed = Array.from(new Set(items.map((i) => i.platform)));
      return { items: paged, total: scored.length, page: dto.page, pageSize: dto.pageSize, sourcesUsed };
    });
  }

  /**
   * Força uma nova busca (sem cache).
   */
  async search(dto: SearchViralVideosDto) {
    const items = await this.searchAcrossSources({
      niche: dto.niche,
      platform: dto.platform,
      region: dto.region,
      language: dto.language,
      maxResults: dto.maxResults,
    });
    const scored = items
      .map((v) => ({ ...v, score: computeViralScore(v) }))
      .sort((a, b) => b.score - a.score);
    return { items: scored, total: scored.length };
  }

  private async searchAcrossSources(opts: {
    niche?: string;
    platform: 'YOUTUBE' | 'TIKTOK' | 'REDDIT' | 'ALL';
    region: string;
    language: string;
    maxResults: number;
  }): Promise<ViralVideo[]> {
    const tasks: Promise<ViralVideo[]>[] = [];
    if (opts.platform === 'YOUTUBE' || opts.platform === 'ALL') {
      tasks.push(viralVideoSources.fromYouTube(opts.niche ?? '', opts.region, opts.language, opts.maxResults));
    }
    if (opts.platform === 'TIKTOK' || opts.platform === 'ALL') {
      tasks.push(viralVideoSources.fromTikTok(opts.niche ?? '', opts.region, opts.language, opts.maxResults));
    }
    if (opts.platform === 'REDDIT' || opts.platform === 'ALL') {
      tasks.push(viralVideoSources.fromReddit(opts.niche ?? '', opts.language, opts.maxResults));
    }
    const groups = await Promise.all(tasks);
    return groups.flat();
  }
}
