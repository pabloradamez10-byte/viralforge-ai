/**
 * Gerador de roteiros faceless PT-BR.
 *
 * IMPORTANTE: este gerador produz conteúdo 100% ORIGINAL.
 * Ele usa o título/descrição/tags do vídeo viral APENAS como
 * "insumo semântico" — referência do tema — e nunca copia
 * o conteúdo do vídeo. O roteiro é escrito do zero.
 *
 * Estratégia:
 * 1) Tenta usar o LLM configurado (OpenAI/Anthropic/Ollama).
 * 2) Em fallback (sem chave / falha), usa gerador determinístico
 *    baseado em templates para garantir que o sistema sempre
 *    produza um roteiro original e usável.
 */

import { aiService } from '../../services/ai/ai.service.js';
import { SYSTEM_FACELESS } from '../../services/ai/prompts.js';
import { generateFallbackFaceless } from './fallback.js';
import type { FacelessScript, GenerateFacelessDto } from './faceless.dto.js';

export async function generateFacelessScript(dto: GenerateFacelessDto): Promise<FacelessScript> {
  const context = buildContext(dto);

  try {
    const result = await aiService.safeJson<{ script: FacelessScript }>(
      [
        { role: 'system', content: SYSTEM_FACELESS },
        { role: 'user', content: context },
      ],
      { temperature: 0.7, maxTokens: 2500 },
    );
    if (result?.script) {
      return sanitize(result.script, dto);
    }
  } catch {
    // cai no fallback
  }

  return generateFallbackFaceless(dto);
}

function buildContext(dto: GenerateFacelessDto): string {
  return `Gere um roteiro faceless ORIGINAL em português do Brasil para um vídeo de ${durationLabel(dto.targetDuration)}.

TEMA DE REFERÊNCIA (apenas como insumo semântico — NÃO copie o conteúdo):
- Plataforma: ${dto.sourcePlatform}
- Título do vídeo de referência: "${dto.sourceTitle}"
${dto.sourceDescription ? `- Descrição do vídeo de referência: ${dto.sourceDescription.slice(0, 400)}` : ''}
${dto.sourceTags?.length ? `- Tags: ${dto.sourceTags.join(', ')}` : ''}
${dto.niche ? `- Nicho: ${dto.niche}` : ''}

CONFIGURAÇÃO:
- Tom: ${dto.tone}
- Idioma de saída: ${dto.language}
- Duração alvo: ${durationLabel(dto.targetDuration)}

REGRAS:
1. O roteiro deve ser TOTALMENTE ORIGINAL. NÃO copie frases do título/descrição.
2. Crie um ângulo NOVO sobre o mesmo tema.
3. Estrutura: hook forte (0-3s), desenvolvimento com fatos/curiosidades, CTA no final.
4. Sugira 4-8 cenas com visual + narração.
5. Sugira legendas estilo "palavra por palavra" para acessibilidade.
6. Sugira 5-10 hashtags em PT-BR.

Responda em JSON com o formato:
{
  "script": {
    "title": "...",
    "hook": "...",
    "narration": "...",
    "scenes": [{"order":1,"name":"...","visual":"...","voiceover":"...","durationSec":5}],
    "captions": "...",
    "hashtags": ["..."],
    "cta": "...",
    "keywords": ["..."],
    "thumbnailSuggestion": "...",
    "estimatedDurationSec": 60,
    "language": "pt-BR"
  }
}`;
}

function durationLabel(d: 'short' | 'medium' | 'long'): string {
  return d === 'short' ? 'curto (30-60s, Shorts/Reels/TikTok)' : d === 'medium' ? 'médio (2-4 min)' : 'longo (6-12 min)';
}

function sanitize(s: FacelessScript, dto: GenerateFacelessDto): FacelessScript {
  return {
    ...s,
    language: dto.language,
    hashtags: (s.hashtags ?? []).map((h) => h.replace(/^#/, '').trim()).filter(Boolean),
    keywords: (s.keywords ?? []).map((k) => k.trim()).filter(Boolean),
  };
}
