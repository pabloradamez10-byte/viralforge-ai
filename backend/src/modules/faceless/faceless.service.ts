import { prisma } from '../../config/prisma.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import { generateFacelessScript } from './generator.js';
import type { GenerateFacelessDto, FacelessScript } from './faceless.dto.js';
import { v4 as uuid } from 'uuid';

export class FacelessService {
  async generate(userId: string, dto: GenerateFacelessDto, sourceUrl?: string): Promise<FacelessScript & { id: string }> {
    const script = await generateFacelessScript(dto);
    const id = uuid();
    const created = await prisma.facelessScript.create({
      data: {
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
        scenes: script.scenes as any,
        captions: script.captions,
        hashtags: script.hashtags.join(' '),
        cta: script.cta,
        keywords: script.keywords.join(', '),
        thumbnailSuggestion: script.thumbnailSuggestion,
        estimatedDurationSec: script.estimatedDurationSec,
        status: 'DRAFT',
      },
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
    const s = await prisma.facelessScript.findFirst({ where: { id, userId } });
    if (!s) throw new NotFoundError('FacelessScript');
    return s;
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await prisma.facelessScript.delete({ where: { id } });
  }
}
