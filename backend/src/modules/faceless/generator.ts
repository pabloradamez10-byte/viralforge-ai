/**
 * Gerador de roteiros faceless em português do Brasil.
 *
 * Objetivos:
 * - usar o vídeo viral somente como referência temática e estrutural;
 * - criar um roteiro original, coerente e mais informativo;
 * - evitar repetição, frases truncadas e afirmações inventadas;
 * - produzir cenas com imagens compatíveis com a narração;
 * - separar texto falado de legendas;
 * - manter a duração aproximada solicitada.
 */

import { aiService } from '../../services/ai/ai.service.js';
import { SYSTEM_FACELESS } from '../../services/ai/prompts.js';
import { generateFallbackFaceless } from './fallback.js';

import type {
  FacelessScript,
  GenerateFacelessDto,
} from './faceless.dto.js';

interface GeneratedFacelessResponse {
  script?: FacelessScript;
}

const MAX_TITLE_LENGTH = 120;
const MAX_HOOK_LENGTH = 220;
const MAX_SCENES = 10;
const MIN_SCENES = 4;

export async function generateFacelessScript(
  dto: GenerateFacelessDto,
): Promise<FacelessScript> {
  const context = buildContext(dto);

  try {
    const result =
      await aiService.safeJson<GeneratedFacelessResponse>(
        [
          {
            role: 'system',
            content: SYSTEM_FACELESS,
          },
          {
            role: 'user',
            content: context,
          },
        ],
        {
          temperature: 0.55,
          maxTokens: 4000,
        },
      );

    if (result?.script) {
      const sanitized = sanitize(
        result.script,
        dto,
      );

      if (isUsableScript(sanitized)) {
        return sanitized;
      }
    }
  } catch (error: unknown) {
    console.warn(
      '⚠️ Falha ao gerar roteiro faceless com IA. Usando fallback.',
      error instanceof Error
        ? error.message
        : error,
    );
  }

  const fallback =
    generateFallbackFaceless(dto);

  return sanitize(
    fallback,
    dto,
  );
}

function buildContext(
  dto: GenerateFacelessDto,
): string {
  const sourceDescription =
    dto.sourceDescription
      ?.replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1200);

  const sourceTags =
    dto.sourceTags
      ?.map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 20);

  return `
Crie um roteiro faceless ORIGINAL em português do Brasil.

O vídeo de referência deve servir somente para identificar:
- tema;
- promessa;
- curiosidade;
- estrutura de retenção;
- possíveis dúvidas do público.

Não copie frases, sequência narrativa, exemplos exclusivos ou conclusões do vídeo original.

REFERÊNCIA VIRAL:
- Plataforma: ${dto.sourcePlatform}
- Título: "${cleanPromptValue(dto.sourceTitle)}"
${
  sourceDescription
    ? `- Descrição: "${cleanPromptValue(sourceDescription)}"`
    : '- Descrição: não disponível'
}
${
  sourceTags?.length
    ? `- Tags: ${sourceTags.map(cleanPromptValue).join(', ')}`
    : '- Tags: não disponíveis'
}
${
  dto.niche
    ? `- Nicho: ${cleanPromptValue(dto.niche)}`
    : '- Nicho: inferir pelo conteúdo'
}

CONFIGURAÇÃO:
- Tom: ${dto.tone}
- Idioma: ${dto.language}
- Duração: ${durationLabel(dto.targetDuration)}

MISSÃO EDITORIAL:
Crie uma versão melhor e mais útil do tema original.

O roteiro deve:
1. começar com um gancho claro e natural;
2. explicar a ideia principal sem frases confusas;
3. acrescentar contexto, curiosidades, exemplos ou consequências;
4. evitar repetir a mesma afirmação em várias cenas;
5. terminar com uma conclusão ou CTA coerente;
6. apresentar progressão lógica entre as cenas;
7. manter narração natural para voz sintetizada;
8. evitar palavras soltas, títulos quebrados ou frases sem sujeito;
9. não inventar estatísticas, estudos, datas ou autoridades;
10. não apresentar opinião como fato confirmado.

REGRAS DE COERÊNCIA:
- O título precisa fazer sentido sozinho.
- O hook precisa introduzir exatamente o tema desenvolvido.
- Cada cena deve avançar a história.
- Cada cena deve acrescentar uma informação nova.
- Não repita o título dentro de todas as cenas.
- Não repita o hook na narração.
- Não repita o CTA mais de uma vez.
- Evite construções ambíguas como:
  "cristã alerta sobre louvores"
  quando não estiver claro quem é a pessoa, qual é o alerta e sobre qual assunto.
- Use frases completas, com sujeito, verbo e complemento.
- Prefira linguagem natural e conversacional.
- Não use clickbait enganoso.

REGRAS PARA AS IMAGENS:
Para cada cena, o campo "visual" deve descrever exatamente o que deve aparecer.

O visual precisa:
- representar diretamente o assunto falado;
- conter pessoas, ambientes, objetos ou ações coerentes;
- evitar termos abstratos demais;
- evitar imagens aleatórias;
- evitar comida, esportes, viagens ou animais quando não tiverem relação com a cena;
- descrever uma busca visual concreta.

Exemplo bom:
"Pessoa em uma igreja moderna observando músicos durante um momento de louvor, plano vertical, iluminação suave."

Exemplo ruim:
"Imagem impactante sobre reflexão."

REGRAS PARA A NARRAÇÃO:
- Escreva para português do Brasil.
- Use frases curtas.
- Use pontuação natural.
- Evite palavras difíceis desnecessárias.
- Escreva "cristão", "cristã", "cristãos" e "cristãs" apenas quando forem semanticamente adequados.
- Evite sequências de palavras que possam gerar pronúncia ambígua.
- Não use abreviações incomuns.
- Não escreva hashtags dentro da narração.

REGRAS PARA AS LEGENDAS:
O campo "captions" deve conter o texto completo da narração, mas dividido em blocos curtos.

Cada bloco de legenda deve:
- ter aproximadamente 3 a 8 palavras;
- representar uma frase ou ideia curta;
- evitar parágrafos longos;
- evitar repetir a mesma frase;
- preservar acentuação e pontuação.

ESTRUTURA DAS CENAS:
- Vídeo curto: 5 a 8 cenas.
- Vídeo médio: 8 a 10 cenas.
- Vídeo longo: até 10 cenas nesta versão.
- Cada cena deve ter nome, visual, voiceover e durationSec.
- A soma das durações deve ficar próxima da duração-alvo.
- O voiceover de cada cena deve corresponder ao visual daquela cena.

FORMATO OBRIGATÓRIO:

{
  "script": {
    "title": "Título original, claro e específico",
    "hook": "Gancho curto e coerente",
    "narration": "Narração completa e sem repetições",
    "scenes": [
      {
        "order": 1,
        "name": "Gancho",
        "visual": "Descrição visual concreta e coerente",
        "voiceover": "Texto falado somente nesta cena",
        "durationSec": 5
      }
    ],
    "captions": "Texto da narração dividido em blocos curtos",
    "hashtags": [
      "hashtag1",
      "hashtag2"
    ],
    "cta": "CTA curto e natural",
    "keywords": [
      "palavra-chave visual específica",
      "outra palavra-chave coerente"
    ],
    "thumbnailSuggestion": "Descrição concreta da miniatura",
    "estimatedDurationSec": 45,
    "language": "pt-BR"
  }
}

Antes de responder, revise silenciosamente:
- título;
- coerência;
- repetição;
- progressão;
- compatibilidade entre visual e voz;
- clareza das frases;
- duração aproximada.
`.trim();
}

function sanitize(
  script: FacelessScript,
  dto: GenerateFacelessDto,
): FacelessScript {
  const rawScenes = Array.isArray(
    script.scenes,
  )
    ? script.scenes
    : [];

  const cleanedScenes = rawScenes
    .map((scene, index) => {
      const voiceover = cleanText(
        scene?.voiceover ?? '',
      );

      const visual = normalizeVisual(
        scene?.visual ?? '',
        voiceover,
        dto,
      );

      const durationSec =
        normalizeSceneDuration(
          scene?.durationSec,
          voiceover,
        );

      return {
        ...scene,
        order: index + 1,
        name:
          cleanText(scene?.name ?? '') ||
          sceneName(index),
        visual,
        voiceover,
        durationSec,
      };
    })
    .filter(
      (scene) =>
        scene.voiceover.length >= 8 &&
        scene.visual.length >= 8,
    );

  const deduplicatedScenes =
    removeRepeatedScenes(
      cleanedScenes,
    ).slice(0, MAX_SCENES);

  const finalScenes =
    deduplicatedScenes.length >=
    MIN_SCENES
      ? deduplicatedScenes
      : cleanedScenes.slice(
          0,
          MAX_SCENES,
        );

  const narrationFromScenes =
    finalScenes
      .map((scene) => scene.voiceover)
      .filter(Boolean)
      .join(' ');

  const narration =
    cleanText(
      narrationFromScenes ||
        script.narration ||
        '',
    );

  const hook = cleanText(
    script.hook ||
      finalScenes[0]?.voiceover ||
      '',
  ).slice(0, MAX_HOOK_LENGTH);

  const title =
    normalizeTitle(
      script.title,
      dto.sourceTitle,
    );

  const cta =
    cleanText(script.cta ?? '');

  const hashtags = uniqueStrings(
    script.hashtags ?? [],
  )
    .map((hashtag) =>
      hashtag
        .replace(/^#+/, '')
        .replace(/\s+/g, '')
        .trim(),
    )
    .filter(Boolean)
    .slice(0, 10);

  const keywords = uniqueStrings(
    script.keywords ?? [],
  )
    .map((keyword) =>
      cleanText(keyword),
    )
    .filter(
      (keyword) =>
        keyword.length >= 3,
    )
    .slice(0, 15);

  const captions =
    buildShortCaptions(
      narration,
    );

  const estimatedDurationSec =
    finalScenes.length > 0
      ? Math.round(
          finalScenes.reduce(
            (total, scene) =>
              total +
              normalizeSceneDuration(
                scene.durationSec,
                scene.voiceover,
              ),
            0,
          ),
        )
      : estimateNarrationDuration(
          narration,
        );

  return {
    ...script,
    title,
    hook,
    narration,
    scenes: finalScenes,
    captions,
    hashtags,
    cta,
    keywords,
    thumbnailSuggestion:
      normalizeThumbnailSuggestion(
        script.thumbnailSuggestion,
        title,
        dto,
      ),
    estimatedDurationSec,
    language: dto.language,
  };
}

function isUsableScript(
  script: FacelessScript,
): boolean {
  if (
    !script.title ||
    script.title.length < 8
  ) {
    return false;
  }

  if (
    !script.hook ||
    script.hook.length < 10
  ) {
    return false;
  }

  if (
    !script.narration ||
    script.narration.length < 80
  ) {
    return false;
  }

  if (
    !Array.isArray(script.scenes) ||
    script.scenes.length < MIN_SCENES
  ) {
    return false;
  }

  const validScenes =
    script.scenes.filter(
      (scene) =>
        cleanText(
          scene.voiceover,
        ).length >= 8 &&
        cleanText(
          scene.visual,
        ).length >= 8,
    );

  return (
    validScenes.length >= MIN_SCENES
  );
}

function removeRepeatedScenes<
  T extends {
    voiceover: string;
  },
>(
  scenes: T[],
): T[] {
  const accepted: T[] = [];
  const normalizedTexts: string[] = [];

  for (const scene of scenes) {
    const normalized =
      normalizeComparisonText(
        scene.voiceover,
      );

    if (!normalized) {
      continue;
    }

    const isRepeated =
      normalizedTexts.some(
        (previous) =>
          similarity(
            normalized,
            previous,
          ) >= 0.68,
      );

    if (isRepeated) {
      continue;
    }

    normalizedTexts.push(
      normalized,
    );

    accepted.push(scene);
  }

  return accepted;
}

function similarity(
  first: string,
  second: string,
): number {
  const firstWords = new Set(
    first.split(' '),
  );

  const secondWords = new Set(
    second.split(' '),
  );

  if (
    firstWords.size === 0 ||
    secondWords.size === 0
  ) {
    return 0;
  }

  let intersection = 0;

  for (const word of firstWords) {
    if (secondWords.has(word)) {
      intersection += 1;
    }
  }

  const union =
    new Set([
      ...firstWords,
      ...secondWords,
    ]).size;

  return union > 0
    ? intersection / union
    : 0;
}

function normalizeComparisonText(
  value: string,
): string {
  return cleanText(value)
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9\s]/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeVisual(
  visual: string,
  voiceover: string,
  dto: GenerateFacelessDto,
): string {
  const cleaned =
    cleanText(visual);

  if (
    cleaned.length >= 25 &&
    !isGenericVisual(cleaned)
  ) {
    return cleaned;
  }

  const topic =
    cleanText(
      voiceover ||
        dto.sourceTitle,
    ).slice(0, 220);

  return [
    `Cena vertical relacionada diretamente ao tema: ${topic}.`,
    'Mostrar pessoas, ambiente ou ação coerente com a narração.',
    'Enquadramento natural, sem textos incorporados e sem elementos aleatórios.',
  ].join(' ');
}

function isGenericVisual(
  visual: string,
): boolean {
  const normalized =
    normalizeComparisonText(
      visual,
    );

  const genericExpressions = [
    'imagem impactante',
    'imagem relacionada',
    'cena chamativa',
    'video de fundo',
    'imagem de apoio',
    'visual dinamico',
    'imagem ilustrativa',
    'algo relacionado',
  ];

  return genericExpressions.some(
    (expression) =>
      normalized.includes(
        expression,
      ),
  );
}

function normalizeSceneDuration(
  duration: unknown,
  voiceover: string,
): number {
  const numericDuration =
    typeof duration === 'number'
      ? duration
      : Number(duration);

  if (
    Number.isFinite(
      numericDuration,
    )
  ) {
    return Math.min(
      Math.max(
        Math.round(
          numericDuration,
        ),
        3,
      ),
      20,
    );
  }

  const estimated =
    estimateNarrationDuration(
      voiceover,
    );

  return Math.min(
    Math.max(estimated, 3),
    20,
  );
}

function estimateNarrationDuration(
  text: string,
): number {
  const words = cleanText(
    text,
  )
    .split(/\s+/)
    .filter(Boolean).length;

  if (words === 0) {
    return 5;
  }

  /*
   * Aproximadamente 145 palavras por minuto.
   */
  return Math.max(
    3,
    Math.ceil(
      words / 2.4,
    ),
  );
}

function buildShortCaptions(
  narration: string,
): string {
  const text = cleanText(
    narration,
  );

  if (!text) {
    return '';
  }

  const sentences =
    text.match(
      /[^.!?]+[.!?]?/g,
    ) ?? [text];

  const blocks: string[] = [];

  for (const sentence of sentences) {
    const words = sentence
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    let current: string[] = [];

    for (const word of words) {
      current.push(word);

      const endsSentence =
        /[.!?]$/.test(word);

      if (
        current.length >= 6 ||
        (
          endsSentence &&
          current.length >= 3
        )
      ) {
        blocks.push(
          current.join(' '),
        );

        current = [];
      }
    }

    if (current.length > 0) {
      if (
        blocks.length > 0 &&
        current.length <= 2
      ) {
        blocks[
          blocks.length - 1
        ] = `${blocks[
          blocks.length - 1
        ]} ${current.join(' ')}`;
      } else {
        blocks.push(
          current.join(' '),
        );
      }
    }
  }

  return blocks
    .map((block) =>
      block.trim(),
    )
    .filter(Boolean)
    .join('\n');
}

function normalizeTitle(
  generatedTitle: string,
  sourceTitle: string,
): string {
  const cleanedGenerated =
    cleanText(generatedTitle);

  const cleanedSource =
    cleanText(sourceTitle);

  let title =
    cleanedGenerated ||
    cleanedSource ||
    'Uma nova perspectiva sobre este assunto';

  title = title
    .replace(
      /\s*[-–—]\s*parte\s*\d+$/i,
      '',
    )
    .replace(
      /\s+/g,
      ' ',
    )
    .trim();

  if (
    title.length >
    MAX_TITLE_LENGTH
  ) {
    title =
      title.slice(
        0,
        MAX_TITLE_LENGTH,
      );

    const lastSpace =
      title.lastIndexOf(' ');

    if (lastSpace > 70) {
      title = title.slice(
        0,
        lastSpace,
      );
    }
  }

  return title;
}

function normalizeThumbnailSuggestion(
  suggestion: string,
  title: string,
  dto: GenerateFacelessDto,
): string {
  const cleaned =
    cleanText(suggestion);

  if (cleaned.length >= 25) {
    return cleaned;
  }

  return [
    `Miniatura vertical relacionada ao tema "${title}".`,
    'Um único elemento principal em destaque.',
    'Expressão ou ação visual clara.',
    'Texto curto de no máximo quatro palavras.',
    `Estética compatível com o nicho ${cleanText(dto.niche || 'do conteúdo')}.`,
  ].join(' ');
}

function uniqueStrings(
  values: string[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const cleaned =
      cleanText(value);

    const normalized =
      normalizeComparisonText(
        cleaned,
      );

    if (
      !cleaned ||
      !normalized ||
      seen.has(normalized)
    ) {
      continue;
    }

    seen.add(normalized);
    result.push(cleaned);
  }

  return result;
}

function cleanText(
  value: unknown,
): string {
  if (
    typeof value !== 'string'
  ) {
    return '';
  }

  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,
      '',
    )
    .replace(/[ \t]+/g, ' ')
    .replace(
      /\n{3,}/g,
      '\n\n',
    )
    .replace(
      /\s+([,.!?;:])/g,
      '$1',
    )
    .trim();
}

function cleanPromptValue(
  value: string,
): string {
  return cleanText(value)
    .replace(
      /["`]/g,
      "'",
    );
}

function sceneName(
  index: number,
): string {
  const names = [
    'Gancho',
    'Contexto',
    'Explicação',
    'Curiosidade',
    'Exemplo',
    'Consequência',
    'Conclusão',
    'CTA',
  ];

  return (
    names[index] ??
    `Cena ${index + 1}`
  );
}

function durationLabel(
  duration:
    | 'short'
    | 'medium'
    | 'long',
): string {
  if (duration === 'short') {
    return [
      'curto',
      'aproximadamente 35 a 60 segundos',
      'ideal para Shorts, Reels ou TikTok',
    ].join(' — ');
  }

  if (duration === 'medium') {
    return [
      'médio',
      'aproximadamente 2 a 4 minutos',
    ].join(' — ');
  }

  return [
    'longo',
    'aproximadamente 6 a 12 minutos',
  ].join(' — ');
}
