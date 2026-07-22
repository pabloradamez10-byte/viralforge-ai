import { Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';

import { prisma } from '../../config/prisma.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import type { GenerateFacelessDto, FacelessScript } from './faceless.dto.js';
import { generateFacelessScript } from './generator.js';

const DOMAIN_RULES: Array<{
  matches: string[];
  anchors: string[];
}> = [
  {
    matches: ['futebol', 'copa do mundo', 'jogador', 'gol', 'estadio', 'campeonato', 'football', 'soccer'],
    anchors: [
      'football players stadium crowd',
      'world cup trophy celebration',
      'international football match fans',
      'soccer history stadium archive',
    ],
  },
  {
    matches: ['inteligencia artificial', 'automacao', 'algoritmo', 'tecnologia', 'artificial intelligence'],
    anchors: [
      'artificial intelligence computer technology',
      'professional using AI software',
      'data automation modern office',
    ],
  },
  {
    matches: ['igreja', 'cristao', 'louvor', 'culto', 'oracao', 'church', 'worship'],
    anchors: [
      'church worship service people',
      'christian prayer modern church',
      'musicians worship church stage',
    ],
  },
  {
    matches: ['dinheiro', 'financa', 'investimento', 'economia', 'finance', 'money'],
    anchors: [
      'financial analyst charts computer',
      'investment data business office',
      'money economy professional',
    ],
  },
  {
    matches: ['saude', 'medico', 'hospital', 'tratamento', 'health', 'doctor'],
    anchors: [
      'doctor hospital patient healthcare',
      'medical professional analyzing results',
      'modern hospital technology',
    ],
  },
];

const AMBIGUOUS_TERMS = new Set([
  'historia',
  'titulo',
  'evento',
  'momento',
  'mundo',
  'impacto',
  'segredo',
  'verdade',
  'coisa',
  'tema',
]);

const DATABASE_WRITE_ATTEMPTS = 3;
const DATABASE_RETRY_DELAYS_MS = [0, 500, 1_500];

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const cleaned = value.replace(/\s+/g, ' ').trim();
    const key = normalize(cleaned);

    if (!cleaned || !key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

function concreteTerms(value: string): string[] {
  const stopWords = new Set([
    'para', 'com', 'sem', 'sobre', 'entre', 'isso', 'essa', 'esse', 'esta', 'este',
    'mais', 'menos', 'muito', 'pouco', 'como', 'quando', 'onde', 'porque', 'uma', 'uns',
    'das', 'dos', 'nas', 'nos', 'que', 'por', 'de', 'da', 'do', 'em', 'na', 'no',
  ]);

  return normalize(value)
    .split(' ')
    .filter((word) => word.length >= 4 && !stopWords.has(word) && !AMBIGUOUS_TERMS.has(word))
    .slice(0, 6);
}

function buildSceneSearchKeywords(
  scene: FacelessScript['scenes'][number],
  script: FacelessScript,
  dto: GenerateFacelessDto,
): string[] {
  const source = [
    dto.niche,
    dto.sourceTitle,
    script.title,
    scene.visual,
    scene.voiceover,
  ]
    .filter(Boolean)
    .join(' ');

  const normalizedSource = normalize(source);
  const domain = DOMAIN_RULES
    .map((rule) => ({
      rule,
      score: rule.matches.reduce(
        (total, match) => total + (normalizedSource.includes(normalize(match)) ? 1 : 0),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score)[0];

  const terms = concreteTerms(`${scene.visual} ${scene.voiceover}`);
  const topicTerms = concreteTerms(`${dto.niche ?? ''} ${dto.sourceTitle} ${script.title}`);
  const queries: string[] = [];

  if (domain && domain.score > 0) {
    const domainAnchor = domain.rule.anchors[0];

    if (domainAnchor && terms.length > 0) {
      queries.push(`${domainAnchor} ${terms.slice(0, 2).join(' ')}`);
    }

    queries.push(...domain.rule.anchors);
  }

  if (topicTerms.length > 0 && terms.length > 0) {
    queries.push(`${topicTerms.slice(0, 3).join(' ')} ${terms.slice(0, 3).join(' ')}`);
  }

  if (terms.length >= 2) {
    queries.push(terms.slice(0, 5).join(' '));
  }

  const original = Array.isArray(scene.searchKeywords)
    ? scene.searchKeywords
    : [];

  return unique([
    ...queries,
    ...original,
  ])
    .filter((query) => query.split(' ').length >= 2)
    .slice(0, 8);
}

function enrichScript(
  script: FacelessScript,
  dto: GenerateFacelessDto,
): FacelessScript {
  return {
    ...script,
    scenes: script.scenes.map((scene) => ({
      ...scene,
      searchKeywords: buildSceneSearchKeywords(scene, script, dto),
    })),
  };
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isTransientDatabaseError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(error.code);
  }

  return [
    'connection closed',
    'connection is closed',
    'kind: closed',
    'server has closed the connection',
    'connection terminated unexpectedly',
    'connection reset by peer',
    'broken pipe',
    'timed out fetching a new connection',
    'can\'t reach database server',
    'cannot reach database server',
  ].some((fragment) => message.includes(fragment));
}

async function createFacelessScriptWithRetry(
  data: Prisma.FacelessScriptUncheckedCreateInput,
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= DATABASE_WRITE_ATTEMPTS; attempt += 1) {
    try {
      const delay = DATABASE_RETRY_DELAYS_MS[attempt - 1] ?? 0;
      if (delay > 0) {
        await sleep(delay);
      }

      if (attempt > 1) {
        await prisma.$connect();
      }

      const created = await prisma.facelessScript.create({ data });

      if (attempt > 1) {
        console.info('✅ DATABASE WRITE RECOVERED', {
          operation: 'facelessScript.create',
          attempt,
          scriptId: created.id,
        });
      }

      return created;
    } catch (error: unknown) {
      lastError = error;
      const transient = isTransientDatabaseError(error);

      console.warn('⚠️ DATABASE WRITE FAILED', {
        operation: 'facelessScript.create',
        attempt,
        transient,
        error: getErrorMessage(error),
      });

      if (!transient || attempt === DATABASE_WRITE_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw lastError;
}

export class FacelessService {
  async generate(
    userId: string,
    dto: GenerateFacelessDto,
    sourceUrl?: string,
  ): Promise<FacelessScript & { id: string }> {
    const generatedScript = await generateFacelessScript(dto);
    const script = enrichScript(generatedScript, dto);
    const id = uuid();

    const created = await createFacelessScriptWithRetry({
      id,
      userId,
      projectId: dto.projectId,
      sourcePlatform: dto.sourcePlatform,
      sourceVideoId: dto.sourceVideoId,
      sourceTitle: dto.sourceTitle,
      sourceUrl,
      niche: dto.niche,
      tone: dto.tone,
      targetDuration: dto.targetDuration,
      language: dto.language,
      title: script.title,
      hook: script.hook,
      narration: script.narration,
      scenes: script.scenes as Prisma.InputJsonValue,
      captions: script.captions,
      hashtags: script.hashtags.join(' '),
      cta: script.cta,
      keywords: script.keywords.join(', '),
      thumbnailSuggestion: script.thumbnailSuggestion,
      estimatedDurationSec: script.estimatedDurationSec,
      status: 'DRAFT',
    });

    return { ...script, id: created.id };
  }

  async list(userId: string, page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      prisma.facelessScript.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.facelessScript.count({ where: { userId } }),
    ]);
    return { items, total, page, pageSize };
  }

  async get(userId: string, id: string) {
    const script = await prisma.facelessScript.findFirst({ where: { id, userId } });
    if (!script) throw new NotFoundError('FacelessScript');
    return script;
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await prisma.facelessScript.delete({ where: { id } });
  }
}
