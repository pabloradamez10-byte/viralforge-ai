import { prisma } from '../../config/prisma.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import { exportScript } from './exporter.js';
import type { ExportFacelessDto, PreparePublicationDto } from './publications.dto.js';

export class PublicationsService {
  /**
   * Exporta um roteiro em diferentes formatos para publicação manual.
   * Não há upload automático nesta fase.
   */
  async export(userId: string, dto: ExportFacelessDto) {
    const s = await prisma.facelessScript.findFirst({ where: { id: dto.scriptId, userId } });
    if (!s) throw new NotFoundError('Script');
    const content = exportScript(s, dto.format);
    return {
      format: dto.format,
      filename: `${slug(s.title)}.${dto.format}`,
      mime: mimeFor(dto.format),
      content,
    };
  }

  /**
   * Prepara um "pacote de publicação" para uso manual.
   * Não publica automaticamente. Apenas organiza o material.
   *
   * Estrutura já alinhada com:
   * - YouTube Data API v3 (videos.insert) — exige OAuth2 do usuário.
   * - TikTok Content Posting API — exige token e arquivos do usuário.
   * - Instagram Graph API — exige Business Account.
   */
  async prepare(userId: string, dto: PreparePublicationDto) {
    const s = await prisma.facelessScript.findFirst({ where: { id: dto.scriptId, userId } });
    if (!s) throw new NotFoundError('Script');
    const caption = dto.caption ?? buildDefaultCaption(s);
    return {
      target: dto.target,
      scheduledAt: dto.scheduledAt ?? null,
      visibility: dto.visibility,
      status: 'READY_TO_PUBLISH_MANUALLY',
      payload: {
        title: s.title,
        description: caption,
        tags: s.hashtags.split(' ').filter(Boolean),
        visibility: dto.visibility,
        thumbnailSuggestion: s.thumbnailSuggestion,
        metadata: {
          durationSec: s.estimatedDurationSec,
          language: s.language,
          niche: s.niche,
        },
        // Estrutura para integração futura com APIs oficiais:
        integrations: {
          YOUTUBE: {
            endpoint: 'https://www.googleapis.com/upload/youtube/v3/videos',
            method: 'POST',
            requiredAuth: 'OAuth2 do canal do usuário',
            parts: ['snippet', 'status'],
            note: 'Upload de vídeo é responsabilidade do usuário (não baixamos nada).',
          },
          TIKTOK: {
            endpoint: 'https://open.tiktokapis.com/v2/post/publish/video/init/',
            method: 'POST',
            requiredAuth: 'TikTok Content Posting API (token de criador)',
            note: 'Requer arquivo de vídeo produzido pelo usuário.',
          },
          INSTAGRAM: {
            endpoint: 'https://graph.facebook.com/v19.0/{ig-user-id}/media',
            method: 'POST',
            requiredAuth: 'Instagram Graph API (Business)',
            note: 'Requer conta Business + container de mídia do usuário.',
          },
          MANUAL: {
            note: 'Sem integração automática. Use o botão Exportar e publique manualmente.',
          },
        },
      },
    };
  }
}

function buildDefaultCaption(s: any): string {
  const tags = (s.hashtags as string).split(' ').filter(Boolean).map((t) => (t.startsWith('#') ? t : '#' + t)).join(' ');
  return `${s.hook}\n\n${s.cta}\n\n${tags}`;
}

function slug(s: string): string {
  return (s || 'roteiro')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function mimeFor(format: string): string {
  switch (format) {
    case 'json':
      return 'application/json';
    case 'srt':
      return 'application/x-subrip';
    case 'markdown':
      return 'text/markdown';
    default:
      return 'text/plain; charset=utf-8';
  }
}
