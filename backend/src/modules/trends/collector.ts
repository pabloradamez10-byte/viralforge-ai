/**
 * Collector — orquestra múltiplas fontes em paralelo e persiste.
 */
import { sources } from '../../services/scrapers/index.js';
import { TrendsRepository } from './trends.repository.js';
import { analyzeRecord } from '../analyzer/analyzer.service-impl.js';
import { logger } from '../../config/logger.js';
import { v4 as uuid } from 'uuid';

const repo = new TrendsRepository();

export interface CollectOptions {
  query: string;
  region?: string;
  language?: string;
  projectId?: string;
  userId?: string;
  sources?: string[];
  limit?: number;
}

export async function collectAndPersist(opts: CollectOptions) {
  const slugs = (opts.sources && opts.sources.length ? opts.sources : Object.keys(sources));
  const tasks = slugs.map(async (slug) => {
    const src = sources[slug];
    if (!src) return [];
    try {
      const items = await src.fetch(opts.query, { region: opts.region, language: opts.language, limit: opts.limit });
      return items.map((it) => ({ slug, ...it }));
    } catch (err) {
      logger.warn({ err, slug }, 'Source fetch failed');
      return [];
    }
  });

  const grouped = await Promise.all(tasks);
  const all = grouped.flat();
  if (!all.length) return { records: 0 };

  // garante userId de sistema para coletas agendadas
  const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
  let userId = opts.userId;
  if (!userId) {
    const { prisma } = await import('../../config/prisma.js');
    const sys = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    userId = sys?.id || SYSTEM_USER_ID;
  }

  // cria TrendSearch "global" da coleta
  const search = await repo.createSearch(userId, {
    query: opts.query,
    region: opts.region || 'global',
    language: opts.language || 'en',
    filters: { sources: slugs },
    projectId: opts.projectId,
  });

  let created = 0;
  for (const item of all) {
    const source = await repo.findSource(item.slug);
    if (!source) continue;
    const record = await repo.createRecord({
      search: { connect: { id: search.id } },
      source: { connect: { id: source.id } },
      externalId: item.externalId,
      title: item.title.slice(0, 500),
      url: item.url,
      payload: item.payload as any,
      publishedAt: item.publishedAt,
    });
    const metrics = analyzeRecord({ title: item.title, payload: item.payload, publishedAt: item.publishedAt });
    await repo.createMetric({
      record: { connect: { id: record.id } },
      search: { connect: { id: search.id } },
      ...metrics,
      timeSeries: metrics.timeSeries as any,
    });
    created++;
  }
  return { records: created, searchId: search.id };
}

// Helper de coleta one-off (sem persistir busca) - usado em testes / sync
export async function collectOnly(opts: CollectOptions) {
  const slugs = (opts.sources && opts.sources.length ? opts.sources : Object.keys(sources));
  const tasks = slugs.map((s) => sources[s]?.fetch(opts.query, { region: opts.region, language: opts.language, limit: opts.limit }) ?? []);
  const grouped = await Promise.all(tasks);
  return grouped.flat();
}

export { uuid };
