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

interface ScriptQualityAssessment {
  approved: boolean;
  score: number;
  thematicFidelity: number;
  specificity: number;
  retention: number;
  coherence: number;
  reasons: string[];
  sourceTerms: string[];
  matchedSourceTerms: string[];
}

const MAX_TITLE_LENGTH = 120;
const MAX_HOOK_LENGTH = 220;
const MAX_SCENES = 10;
const MIN_SCENES = 4;
const MAX_GENERATION_ATTEMPTS = 2;
const MIN_QUALITY_SCORE = 68;
const MIN_THEMATIC_FIDELITY = 55;

const STOP_WORDS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'em', 'no',
  'na', 'nos', 'nas', 'para', 'por', 'com', 'sem', 'sobre', 'entre', 'que', 'como',
  'porque', 'quando', 'onde', 'isso', 'isto', 'esse', 'essa', 'este', 'esta', 'mais',
  'menos', 'muito', 'muita', 'pouco', 'pode', 'podem', 'deve', 'devem', 'foi', 'era',
  'ser', 'sao', 'tem', 'ter', 'faz', 'fazer', 'video', 'viral', 'humor', 'shorts',
  'reels', 'tiktok', 'youtube', 'parte', 'oficial', 'novo', 'nova', 'mundo',
]);

const GENERIC_PHRASES = [
  'imagine se',
  'o futuro da',
  'uma ferramenta poderosa',
  'nos dias de hoje',
  'voce sabia que',
  'isso vai mudar tudo',
  'pode ajudar em sua',
  'focar em nossa criatividade',
  'aspectos mais importantes',
  'tecnologia que permite',
];

export async function generateFacelessScript(
  dto: GenerateFacelessDto,
): Promise<FacelessScript> {
  const baseContext = buildContext(dto);
  let lastAssessment: ScriptQualityAssessment | undefined;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      const correction = lastAssessment
        ? buildCorrectionInstruction(lastAssessment, dto)
        : '';

      const result = await aiService.safeJson<GeneratedFacelessResponse>(
        [
          { role: 'system', content: SYSTEM_FACELESS },
          {
            role: 'user',
            content: [baseContext, correction].filter(Boolean).join('\n\n'),
          },
        ],
        {
          temperature: attempt === 1 ? 0.5 : 0.35,
          maxTokens: 4500,
        },
      );

      if (!result?.script) {
        throw new Error('A IA não retornou o objeto script.');
      }

      const sanitized = sanitize(result.script, dto);
      const assessment = assessScriptQuality(sanitized, dto);
      lastAssessment = assessment;

      console.info('🧠 SCRIPT QUALITY GATE', {
        attempt,
        approved: assessment.approved,
        score: assessment.score,
        thematicFidelity: assessment.thematicFidelity,
        specificity: assessment.specificity,
        retention: assessment.retention,
        coherence: assessment.coherence,
        sourceTerms: assessment.sourceTerms,
        matchedSourceTerms: assessment.matchedSourceTerms,
        reasons: assessment.reasons,
      });

      if (isUsableScript(sanitized) && assessment.approved) {
        return sanitized;
      }

      console.warn('🔁 SCRIPT QUALITY RETRY', {
        attempt,
        score: assessment.score,
        reasons: assessment.reasons,
      });
    } catch (error: unknown) {
      console.warn(
        `⚠️ Falha na tentativa ${attempt} de gerar roteiro faceless.`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  const fallback = sanitize(generateFallbackFaceless(dto), dto);
  const fallbackAssessment = assessScriptQuality(fallback, dto);

  console.warn('🛟 SCRIPT FALLBACK ASSESSMENT', {
    score: fallbackAssessment.score,
    thematicFidelity: fallbackAssessment.thematicFidelity,
    approved: fallbackAssessment.approved,
    reasons: fallbackAssessment.reasons,
  });

  return fallback;
}

function buildCorrectionInstruction(
  assessment: ScriptQualityAssessment,
  dto: GenerateFacelessDto,
): string {
  return `
CORREÇÃO OBRIGATÓRIA — A tentativa anterior foi REPROVADA pelo Script Quality Gate.

Tema da referência: "${cleanPromptValue(dto.sourceTitle)}"
Termos centrais obrigatórios: ${assessment.sourceTerms.join(', ') || 'inferir do título'}
Termos centrais encontrados na tentativa anterior: ${assessment.matchedSourceTerms.join(', ') || 'nenhum'}
Nota anterior: ${assessment.score}/100
Problemas: ${assessment.reasons.join(' | ')}

REFAÇA DO ZERO e cumpra estas condições:
- preserve claramente o assunto, personagens, entidades, competição, local ou conflito presentes na referência;
- não transforme o tema em inteligência artificial, criatividade, tecnologia ou outro assunto genérico;
- use pelo menos dois termos centrais da referência no título, hook ou narração;
- produza um gancho específico, ligado ao conflito real da referência;
- cada cena deve acrescentar um acontecimento ou consequência concreta;
- evite frases genéricas como "imagine se", "o futuro da" e "uma ferramenta poderosa";
- mantenha originalidade: não copie a redação da fonte, mas não abandone o tema;
- devolva somente o JSON obrigatório.
`.trim();
}

function buildContext(dto: GenerateFacelessDto): string {
  const sourceDescription = dto.sourceDescription
    ?.replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);

  const sourceTags = dto.sourceTags
    ?.map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);

  const sourceTerms = extractSourceTerms(dto);

  return `
Crie um roteiro faceless ORIGINAL em português do Brasil.

A referência define o ASSUNTO. Você pode criar uma abordagem nova, mas não pode trocar o tema.

REFERÊNCIA VIRAL:
- Plataforma: ${dto.sourcePlatform}
- Título: "${cleanPromptValue(dto.sourceTitle)}"
${sourceDescription ? `- Descrição: "${cleanPromptValue(sourceDescription)}"` : '- Descrição: não disponível'}
${sourceTags?.length ? `- Tags: ${sourceTags.map(cleanPromptValue).join(', ')}` : '- Tags: não disponíveis'}
${dto.niche ? `- Nicho: ${cleanPromptValue(dto.niche)}` : '- Nicho: inferir pelo conteúdo'}
- Termos centrais detectados: ${sourceTerms.join(', ') || 'inferir pelo título'}

CONFIGURAÇÃO:
- Tom: ${dto.tone}
- Idioma: ${dto.language}
- Duração: ${durationLabel(dto.targetDuration)}

REGRAS EDITORIAIS OBRIGATÓRIAS:
1. O título, o hook e a narração precisam permanecer no mesmo tema da referência.
2. Preserve entidades e contexto centrais: pessoas, times, países, competição, produto, lugar ou conflito.
3. Não gere um texto genérico sobre IA, criatividade, tecnologia, sucesso ou futuro se isso não for o assunto da referência.
4. Comece com tensão, surpresa, contraste ou consequência específica.
5. Cada cena precisa avançar a narrativa e acrescentar informação nova.
6. Use frases curtas, naturais e adequadas para voz sintetizada.
7. Não invente estatísticas, estudos, datas ou autoridades.
8. O visual de cada cena deve descrever pessoas, objetos, ambientes e ações concretas.
9. Cada cena deve incluir searchKeywords com 3 a 6 consultas visuais em inglês, específicas para aquela cena.
10. Evite clichês como "imagine se", "o futuro da", "uma ferramenta poderosa" e "isso vai mudar tudo".

FORMATO OBRIGATÓRIO:
{
  "script": {
    "title": "Título original, específico e ligado à referência",
    "hook": "Gancho específico de 1 a 2 frases",
    "narration": "Narração completa",
    "scenes": [
      {
        "order": 1,
        "name": "Gancho",
        "visual": "Descrição visual concreta",
        "voiceover": "Texto falado nesta cena",
        "durationSec": 5,
        "searchKeywords": ["specific visual query", "alternative query"]
      }
    ],
    "captions": "Texto da narração em blocos curtos",
    "hashtags": ["hashtag1", "hashtag2"],
    "cta": "CTA curto e natural",
    "keywords": ["termo visual específico"],
    "thumbnailSuggestion": "Descrição concreta da miniatura",
    "estimatedDurationSec": 45,
    "language": "pt-BR"
  }
}

Antes de responder, revise silenciosamente a fidelidade temática, especificidade, retenção, progressão e compatibilidade entre visual e voz.
`.trim();
}

function assessScriptQuality(
  script: FacelessScript,
  dto: GenerateFacelessDto,
): ScriptQualityAssessment {
  const reasons: string[] = [];
  const sourceTerms = extractSourceTerms(dto);
  const scriptText = normalizeComparisonText([
    script.title,
    script.hook,
    script.narration,
    script.cta,
    ...script.scenes.flatMap((scene) => [
      scene.name,
      scene.visual,
      scene.voiceover,
      ...(scene.searchKeywords ?? []),
    ]),
    ...(script.keywords ?? []),
  ].join(' '));

  const matchedSourceTerms = sourceTerms.filter((term) =>
    scriptText.includes(normalizeComparisonText(term)),
  );

  const sourceCoverage = sourceTerms.length === 0
    ? 0.75
    : matchedSourceTerms.length / Math.min(sourceTerms.length, 6);

  let thematicFidelity = Math.round(Math.min(sourceCoverage, 1) * 100);

  const sourceDomain = detectTopicDomain(
    [dto.sourceTitle, dto.sourceDescription, ...(dto.sourceTags ?? []), dto.niche]
      .filter(Boolean)
      .join(' '),
  );
  const scriptDomain = detectTopicDomain(scriptText);

  if (sourceDomain !== 'generic' && scriptDomain !== 'generic' && sourceDomain !== scriptDomain) {
    thematicFidelity = Math.max(0, thematicFidelity - 55);
    reasons.push(`desvio de tema: referência=${sourceDomain}, roteiro=${scriptDomain}`);
  }

  if (matchedSourceTerms.length === 0 && sourceTerms.length >= 2) {
    reasons.push('nenhum termo central da referência foi preservado');
  } else if (matchedSourceTerms.length < 2 && sourceTerms.length >= 3) {
    reasons.push('poucos termos centrais da referência foram preservados');
  }

  const genericHits = GENERIC_PHRASES.filter((phrase) => scriptText.includes(phrase));
  const concreteVisuals = script.scenes.filter(
    (scene) => cleanText(scene.visual).length >= 35 && !isGenericVisual(scene.visual),
  ).length;
  const keywordScenes = script.scenes.filter(
    (scene) => Array.isArray(scene.searchKeywords) && scene.searchKeywords.length >= 2,
  ).length;

  let specificity = 45;
  specificity += Math.min(matchedSourceTerms.length * 8, 24);
  specificity += Math.round((concreteVisuals / Math.max(script.scenes.length, 1)) * 20);
  specificity += Math.round((keywordScenes / Math.max(script.scenes.length, 1)) * 11);
  specificity -= genericHits.length * 9;
  specificity = clampScore(specificity);

  if (genericHits.length > 0) {
    reasons.push(`frases genéricas: ${genericHits.join(', ')}`);
  }
  if (concreteVisuals < Math.ceil(script.scenes.length * 0.7)) {
    reasons.push('visuais pouco específicos em várias cenas');
  }

  const hookWords = wordCount(script.hook);
  const questionOrTension = /[?!]|mas |quase |nunca |antes |segredo|verdade|problema|conflito|quer tirar|contra/i.test(script.hook);
  const sceneVariety = calculateSceneVariety(script);
  let retention = 45;
  if (hookWords >= 5 && hookWords <= 28) retention += 15;
  if (questionOrTension) retention += 15;
  retention += Math.round(sceneVariety * 20);
  if (genericHits.length >= 2) retention -= 18;
  retention = clampScore(retention);

  if (!questionOrTension) {
    reasons.push('gancho sem tensão, contraste ou curiosidade específica');
  }
  if (sceneVariety < 0.55) {
    reasons.push('cenas repetitivas ou sem progressão suficiente');
  }

  const narrationFromScenes = normalizeComparisonText(
    script.scenes.map((scene) => scene.voiceover).join(' '),
  );
  const narration = normalizeComparisonText(script.narration);
  const narrationAlignment = narration && narrationFromScenes
    ? similarity(narration, narrationFromScenes)
    : 0;
  const validSceneRatio = script.scenes.filter(
    (scene) => cleanText(scene.voiceover).length >= 8 && cleanText(scene.visual).length >= 20,
  ).length / Math.max(script.scenes.length, 1);

  let coherence = Math.round(narrationAlignment * 45 + validSceneRatio * 45 + 10);
  coherence = clampScore(coherence);

  if (narrationAlignment < 0.45) {
    reasons.push('narração completa não corresponde bem às cenas');
  }

  const score = Math.round(
    thematicFidelity * 0.42 +
    specificity * 0.22 +
    retention * 0.2 +
    coherence * 0.16,
  );

  const approved =
    score >= MIN_QUALITY_SCORE &&
    thematicFidelity >= MIN_THEMATIC_FIDELITY &&
    isUsableScript(script);

  if (score < MIN_QUALITY_SCORE) reasons.push(`nota geral abaixo de ${MIN_QUALITY_SCORE}`);
  if (thematicFidelity < MIN_THEMATIC_FIDELITY) {
    reasons.push(`fidelidade temática abaixo de ${MIN_THEMATIC_FIDELITY}`);
  }

  return {
    approved,
    score,
    thematicFidelity,
    specificity,
    retention,
    coherence,
    reasons: uniqueStrings(reasons),
    sourceTerms,
    matchedSourceTerms,
  };
}

function extractSourceTerms(dto: GenerateFacelessDto): string[] {
  const raw = [
    dto.sourceTitle,
    dto.sourceDescription ?? '',
    ...(dto.sourceTags ?? []),
    dto.niche ?? '',
  ].join(' ');

  const normalized = normalizeComparisonText(raw);
  const words = normalized.split(/\s+/).filter(Boolean);
  const terms: string[] = [];

  const importantPhrases = [
    'copa do mundo', 'world cup', 'inteligencia artificial', 'artificial intelligence',
    'mercado financeiro', 'rede social', 'futebol feminino', 'formula 1',
  ];

  for (const phrase of importantPhrases) {
    if (normalized.includes(phrase)) terms.push(phrase);
  }

  for (const word of words) {
    if (word.length < 4 || STOP_WORDS.has(word) || /^\d+$/.test(word)) continue;
    if (!terms.includes(word)) terms.push(word);
    if (terms.length >= 10) break;
  }

  return terms.slice(0, 10);
}

function detectTopicDomain(value: string): string {
  const normalized = normalizeComparisonText(value);
  const domains: Record<string, string[]> = {
    football: ['futebol', 'football', 'soccer', 'copa', 'mundial', 'gol', 'jogador', 'selecao', 'argentina', 'espanha', 'taca', 'campeonato'],
    technology: ['inteligencia artificial', 'artificial intelligence', 'tecnologia', 'software', 'algoritmo', 'maquina', 'computador', 'criatividade'],
    finance: ['dinheiro', 'financa', 'investimento', 'banco', 'mercado', 'economia'],
    religion: ['igreja', 'cristao', 'culto', 'louvor', 'oracao', 'fe'],
    health: ['saude', 'medico', 'hospital', 'doenca', 'tratamento'],
    travel: ['viagem', 'turismo', 'aeroporto', 'cidade', 'pais'],
    food: ['comida', 'receita', 'cozinha', 'restaurante', 'chef'],
  };

  let best = 'generic';
  let bestScore = 0;
  for (const [domain, terms] of Object.entries(domains)) {
    const score = terms.reduce((total, term) => total + (normalized.includes(term) ? 1 : 0), 0);
    if (score > bestScore) {
      best = domain;
      bestScore = score;
    }
  }
  return best;
}

function calculateSceneVariety(script: FacelessScript): number {
  if (script.scenes.length < 2) return 0;
  let comparisons = 0;
  let totalSimilarity = 0;
  for (let index = 1; index < script.scenes.length; index += 1) {
    const previous = normalizeComparisonText(script.scenes[index - 1]?.voiceover ?? '');
    const current = normalizeComparisonText(script.scenes[index]?.voiceover ?? '');
    if (!previous || !current) continue;
    totalSimilarity += similarity(previous, current);
    comparisons += 1;
  }
  return comparisons === 0 ? 0 : clamp01(1 - totalSimilarity / comparisons);
}

function sanitize(script: FacelessScript, dto: GenerateFacelessDto): FacelessScript {
  const rawScenes = Array.isArray(script.scenes) ? script.scenes : [];
  const cleanedScenes = rawScenes
    .map((scene, index) => {
      const voiceover = cleanText(scene?.voiceover ?? '');
      const visual = normalizeVisual(scene?.visual ?? '', voiceover, dto);
      const durationSec = normalizeSceneDuration(scene?.durationSec, voiceover);
      const searchKeywords = uniqueStrings(
        Array.isArray(scene?.searchKeywords) ? scene.searchKeywords : [],
      )
        .map((keyword) => cleanText(keyword))
        .filter((keyword) => keyword.length >= 3)
        .slice(0, 10);

      return {
        ...scene,
        order: index + 1,
        name: cleanText(scene?.name ?? '') || sceneName(index),
        visual,
        voiceover,
        durationSec,
        searchKeywords,
      };
    })
    .filter((scene) => scene.voiceover.length >= 8 && scene.visual.length >= 8);

  const deduplicatedScenes = removeRepeatedScenes(cleanedScenes).slice(0, MAX_SCENES);
  const finalScenes = deduplicatedScenes.length >= MIN_SCENES
    ? deduplicatedScenes
    : cleanedScenes.slice(0, MAX_SCENES);

  const narration = cleanText(
    finalScenes.map((scene) => scene.voiceover).filter(Boolean).join(' ') || script.narration || '',
  );
  const hook = cleanText(script.hook || finalScenes[0]?.voiceover || '').slice(0, MAX_HOOK_LENGTH);
  const title = normalizeTitle(script.title, dto.sourceTitle);
  const cta = cleanText(script.cta ?? '');
  const hashtags = uniqueStrings(script.hashtags ?? [])
    .map((hashtag) => hashtag.replace(/^#+/, '').replace(/\s+/g, '').trim())
    .filter(Boolean)
    .slice(0, 10);
  const keywords = uniqueStrings(script.keywords ?? [])
    .map((keyword) => cleanText(keyword))
    .filter((keyword) => keyword.length >= 3)
    .slice(0, 15);
  const captions = buildShortCaptions(narration);
  const estimatedDurationSec = finalScenes.length > 0
    ? Math.round(finalScenes.reduce(
        (total, scene) => total + normalizeSceneDuration(scene.durationSec, scene.voiceover),
        0,
      ))
    : estimateNarrationDuration(narration);

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
    thumbnailSuggestion: normalizeThumbnailSuggestion(
      script.thumbnailSuggestion,
      title,
      dto,
    ),
    estimatedDurationSec,
    language: dto.language,
  };
}

function isUsableScript(script: FacelessScript): boolean {
  if (!script.title || script.title.length < 8) return false;
  if (!script.hook || script.hook.length < 10) return false;
  if (!script.narration || script.narration.length < 80) return false;
  if (!Array.isArray(script.scenes) || script.scenes.length < MIN_SCENES) return false;
  return script.scenes.filter(
    (scene) => cleanText(scene.voiceover).length >= 8 && cleanText(scene.visual).length >= 8,
  ).length >= MIN_SCENES;
}

function removeRepeatedScenes<T extends { voiceover: string }>(scenes: T[]): T[] {
  const accepted: T[] = [];
  const normalizedTexts: string[] = [];
  for (const scene of scenes) {
    const normalized = normalizeComparisonText(scene.voiceover);
    if (!normalized) continue;
    if (normalizedTexts.some((previous) => similarity(normalized, previous) >= 0.68)) continue;
    normalizedTexts.push(normalized);
    accepted.push(scene);
  }
  return accepted;
}

function similarity(first: string, second: string): number {
  const firstWords = new Set(first.split(' ').filter(Boolean));
  const secondWords = new Set(second.split(' ').filter(Boolean));
  if (firstWords.size === 0 || secondWords.size === 0) return 0;
  let intersection = 0;
  for (const word of firstWords) if (secondWords.has(word)) intersection += 1;
  const union = new Set([...firstWords, ...secondWords]).size;
  return union > 0 ? intersection / union : 0;
}

function normalizeComparisonText(value: string): string {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeVisual(
  visual: string,
  voiceover: string,
  dto: GenerateFacelessDto,
): string {
  const cleaned = cleanText(visual);
  if (cleaned.length >= 25 && !isGenericVisual(cleaned)) return cleaned;
  const topic = cleanText(voiceover || dto.sourceTitle).slice(0, 220);
  return [
    `Cena vertical relacionada diretamente ao tema: ${topic}.`,
    'Mostrar pessoas, ambiente ou ação coerente com a narração.',
    'Enquadramento natural, sem textos incorporados e sem elementos aleatórios.',
  ].join(' ');
}

function isGenericVisual(visual: string): boolean {
  const normalized = normalizeComparisonText(visual);
  return [
    'imagem impactante', 'imagem relacionada', 'cena chamativa', 'video de fundo',
    'imagem de apoio', 'visual dinamico', 'imagem ilustrativa', 'algo relacionado',
  ].some((expression) => normalized.includes(expression));
}

function normalizeSceneDuration(duration: unknown, voiceover: string): number {
  const numericDuration = typeof duration === 'number' ? duration : Number(duration);
  if (Number.isFinite(numericDuration)) {
    return Math.min(Math.max(Math.round(numericDuration), 3), 20);
  }
  return Math.min(Math.max(estimateNarrationDuration(voiceover), 3), 20);
}

function estimateNarrationDuration(text: string): number {
  const words = wordCount(text);
  return words === 0 ? 5 : Math.max(3, Math.ceil(words / 2.4));
}

function wordCount(text: string): number {
  return cleanText(text).split(/\s+/).filter(Boolean).length;
}

function buildShortCaptions(narration: string): string {
  const text = cleanText(narration);
  if (!text) return '';
  const sentences = text.match(/[^.!?]+[.!?]?/g) ?? [text];
  const blocks: string[] = [];
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    let current: string[] = [];
    for (const word of words) {
      current.push(word);
      if (current.length >= 6 || (/[.!?]$/.test(word) && current.length >= 3)) {
        blocks.push(current.join(' '));
        current = [];
      }
    }
    if (current.length > 0) {
      if (blocks.length > 0 && current.length <= 2) {
        blocks[blocks.length - 1] = `${blocks[blocks.length - 1]} ${current.join(' ')}`;
      } else {
        blocks.push(current.join(' '));
      }
    }
  }
  return blocks.map((block) => block.trim()).filter(Boolean).join('\n');
}

function normalizeTitle(generatedTitle: string, sourceTitle: string): string {
  let title = cleanText(generatedTitle) || cleanText(sourceTitle) || 'Uma nova perspectiva sobre este assunto';
  title = title.replace(/\s*[-–—]\s*parte\s*\d+$/i, '').replace(/\s+/g, ' ').trim();
  if (title.length > MAX_TITLE_LENGTH) {
    title = title.slice(0, MAX_TITLE_LENGTH);
    const lastSpace = title.lastIndexOf(' ');
    if (lastSpace > 70) title = title.slice(0, lastSpace);
  }
  return title;
}

function normalizeThumbnailSuggestion(
  suggestion: string,
  title: string,
  dto: GenerateFacelessDto,
): string {
  const cleaned = cleanText(suggestion);
  if (cleaned.length >= 25) return cleaned;
  return [
    `Miniatura vertical relacionada ao tema "${title}".`,
    'Um único elemento principal em destaque.',
    'Expressão ou ação visual clara.',
    'Texto curto de no máximo quatro palavras.',
    `Estética compatível com o nicho ${cleanText(dto.niche || 'do conteúdo')}.`,
  ].join(' ');
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = cleanText(value);
    const normalized = normalizeComparisonText(cleaned);
    if (!cleaned || !normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(cleaned);
  }
  return result;
}

function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
}

function cleanPromptValue(value: string): string {
  return cleanText(value).replace(/["`]/g, "'");
}

function sceneName(index: number): string {
  const names = [
    'Gancho', 'Contexto', 'Explicação', 'Curiosidade',
    'Exemplo', 'Consequência', 'Conclusão', 'CTA',
  ];
  return names[index] ?? `Cena ${index + 1}`;
}

function durationLabel(duration: 'short' | 'medium' | 'long'): string {
  if (duration === 'short') {
    return 'curto — aproximadamente 35 a 60 segundos — ideal para Shorts, Reels ou TikTok';
  }
  if (duration === 'medium') return 'médio — aproximadamente 2 a 4 minutos';
  return 'longo — aproximadamente 6 a 12 minutos';
}

function clampScore(value: number): number {
  return Math.round(Math.min(Math.max(value, 0), 100));
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
