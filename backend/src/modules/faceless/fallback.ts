/**
 * Fallback determinístico para geração de roteiros faceless.
 *
 * Este gerador é usado quando o serviço de IA não está disponível.
 *
 * Princípios:
 * - não inventar fatos, números, estudos ou acontecimentos;
 * - não repetir a mesma frase em várias cenas;
 * - preservar o sentido do título original;
 * - utilizar descrição e tags como contexto quando disponíveis;
 * - produzir narração natural em português do Brasil;
 * - gerar instruções visuais concretas;
 * - separar CTA, desenvolvimento e conclusão;
 * - evitar promessas que o vídeo não consegue entregar.
 */

import type {
  FacelessScript,
  GenerateFacelessDto,
} from './faceless.dto.js';

interface DurationConfig {
  totalSec: number;
  sceneCount: number;
  wordsPerScene: number;
}

interface TopicContext {
  topic: string;
  subject: string;
  descriptionSummary: string;
  keywords: string[];
}

interface SceneDraft {
  name: string;
  visual: string;
  voiceover: string;
}

export function generateFallbackFaceless(
  dto: GenerateFacelessDto,
): FacelessScript {
  const context = buildTopicContext(dto);
  const duration = durationConfig(
    dto.targetDuration,
  );

  const drafts = buildSceneDrafts(
    context,
    dto.tone,
  );

  const selectedDrafts = normalizeSceneCount(
    drafts,
    duration.sceneCount,
    context,
  );

  const sceneDuration =
    Math.max(
      4,
      Math.round(
        duration.totalSec /
          selectedDrafts.length,
      ),
    );

  const scenes: FacelessScript['scenes'] =
    selectedDrafts.map(
      (
        scene: SceneDraft,
        index: number,
      ) => ({
        order: index + 1,
        name: scene.name,
        visual: scene.visual,
        voiceover:
          limitWords(
            scene.voiceover,
            duration.wordsPerScene,
          ),
        durationSec:
          sceneDuration,
      }),
    );

  const narration = scenes
    .map(
      (scene) =>
        cleanText(
          scene.voiceover,
        ),
    )
    .filter(Boolean)
    .join(' ');

  const hook =
    scenes[0]?.voiceover ??
    buildDefaultHook(
      context.topic,
    );

  const cta = buildCta(
    dto.tone,
    context.topic,
  );

  const finalScenes =
    appendCtaToLastScene(
      scenes,
      cta,
    );

  const finalNarration =
    finalScenes
      .map(
        (scene) =>
          cleanText(
            scene.voiceover,
          ),
      )
      .filter(Boolean)
      .join(' ');

  return {
    title: buildTitle(
      context,
      dto.tone,
    ),

    hook:
      cleanText(hook),

    narration:
      finalNarration ||
      narration,

    scenes:
      finalScenes,

    captions:
      buildCaptions(
        finalScenes,
      ),

    hashtags:
      buildHashtags(
        dto.niche ??
          context.topic,
        dto.tone,
        context.keywords,
      ),

    cta,

    keywords:
      buildKeywords(
        context,
      ),

    thumbnailSuggestion:
      buildThumbnail(
        context,
        dto.tone,
      ),

    estimatedDurationSec:
      finalScenes.reduce(
        (
          total: number,
          scene,
        ) =>
          total +
          scene.durationSec,
        0,
      ),

    language:
      dto.language,
  };
}

function buildTopicContext(
  dto: GenerateFacelessDto,
): TopicContext {
  const cleanTitle =
    cleanSourceTitle(
      dto.sourceTitle,
    );

  const description =
    cleanText(
      dto.sourceDescription ??
        '',
    );

  const tags =
    Array.isArray(
      dto.sourceTags,
    )
      ? dto.sourceTags
          .map(
            (tag: string) =>
              cleanText(tag),
          )
          .filter(Boolean)
      : [];

  const topic =
    extractTopic(
      cleanTitle,
      tags,
      dto.niche,
    );

  const subject =
    buildNaturalSubject(
      cleanTitle,
      topic,
    );

  const descriptionSummary =
    summarizeDescription(
      description,
      topic,
    );

  const keywords =
    uniqueStrings([
      topic,
      ...tags,
      ...(dto.niche
        ? [dto.niche]
        : []),
    ]).slice(0, 12);

  return {
    topic,
    subject,
    descriptionSummary,
    keywords,
  };
}

function buildSceneDrafts(
  context: TopicContext,
  tone:
    GenerateFacelessDto['tone'],
): SceneDraft[] {
  const hook =
    buildHook(
      context,
      tone,
    );

  const contextSentence =
    context.descriptionSummary
      ? `O conteúdo de referência relaciona esse tema a ${context.descriptionSummary}.`
      : `Esse assunto vem chamando atenção porque pode ser interpretado de maneiras muito diferentes.`;

  const clarification =
    `Antes de aceitar qualquer conclusão sobre ${context.topic}, é importante separar o que foi realmente apresentado daquilo que é apenas interpretação.`;

  const practicalQuestion =
    `A pergunta mais útil não é apenas se ${context.topic} chama atenção, mas o que esse assunto muda na prática para quem está acompanhando.`;

  const balancedPoint =
    `Também vale observar que um título forte pode resumir demais um tema complexo. Por isso, contexto e fontes fazem diferença.`;

  const conclusion =
    `A melhor forma de entender ${context.topic} é comparar informações, identificar o ponto principal e evitar conclusões apressadas.`;

  const baseScenes: SceneDraft[] = [
    {
      name: 'Gancho',
      visual:
        buildHookVisual(
          context,
        ),
      voiceover:
        hook,
    },
    {
      name: 'Contexto',
      visual:
        buildContextVisual(
          context,
        ),
      voiceover:
        contextSentence,
    },
    {
      name: 'Ponto principal',
      visual:
        buildAnalysisVisual(
          context,
        ),
      voiceover:
        clarification,
    },
    {
      name: 'Aplicação',
      visual:
        buildPracticalVisual(
          context,
        ),
      voiceover:
        practicalQuestion,
    },
    {
      name: 'Contraponto',
      visual:
        buildComparisonVisual(
          context,
        ),
      voiceover:
        balancedPoint,
    },
    {
      name: 'Conclusão',
      visual:
        buildConclusionVisual(
          context,
        ),
      voiceover:
        conclusion,
    },
  ];

  if (
    tone === 'educativo'
  ) {
    baseScenes.splice(
      4,
      0,
      {
        name:
          'Como analisar',
        visual:
          `Pessoa comparando diferentes fontes sobre ${context.topic} em um computador, gráficos e anotações visíveis, enquadramento vertical.`,
        voiceover:
          `Para analisar melhor, procure a origem da informação, compare versões diferentes e veja se existem exemplos concretos.`,
      },
    );
  }

  if (
    tone === 'polêmico'
  ) {
    baseScenes.splice(
      4,
      0,
      {
        name:
          'Debate',
        visual:
          `Duas pessoas debatendo pontos de vista diferentes sobre ${context.topic}, ambiente de estúdio, enquadramento vertical.`,
        voiceover:
          `O problema começa quando uma opinião é apresentada como certeza e o debate deixa de considerar outras explicações.`,
      },
    );
  }

  if (
    tone ===
    'storytelling'
  ) {
    baseScenes.splice(
      2,
      0,
      {
        name:
          'Início da história',
        visual:
          `Sequência narrativa mostrando alguém descobrindo informações sobre ${context.topic}, celular, computador e anotações, estilo documental.`,
        voiceover:
          `Tudo começa quando uma informação chama atenção, ganha força e passa a ser repetida sem que o contexto completo seja verificado.`,
      },
    );
  }

  if (
    tone === 'humor'
  ) {
    baseScenes.splice(
      3,
      0,
      {
        name:
          'Quebra de expectativa',
        visual:
          `Pessoa confusa diante de várias opiniões contraditórias sobre ${context.topic}, reação leve e natural, sem elementos caricatos.`,
        voiceover:
          `Aí acontece o clássico: cada pessoa explica de um jeito, e no final todo mundo parece estar falando de assuntos diferentes.`,
      },
    );
  }

  return removeRepeatedDrafts(
    baseScenes,
  );
}

function buildHook(
  context: TopicContext,
  tone:
    GenerateFacelessDto['tone'],
): string {
  const topic =
    context.topic;

  const hooks:
    Record<
      GenerateFacelessDto['tone'],
      string[]
    > = {
      curioso: [
        `Tem um detalhe importante sobre ${topic} que costuma desaparecer quando esse assunto vira apenas um título chamativo.`,
        `Antes de formar uma opinião sobre ${topic}, existe uma pergunta que precisa ser respondida.`,
        `${capitalize(topic)} parece simples à primeira vista, mas o contexto muda completamente a interpretação.`,
      ],

      educativo: [
        `Em poucos segundos, você vai entender como analisar ${topic} sem cair em conclusões apressadas.`,
        `Para entender ${topic}, precisamos separar três coisas: informação, interpretação e consequência.`,
      ],

      polêmico: [
        `O debate sobre ${topic} costuma começar com uma conclusão forte e quase nenhum contexto.`,
        `Muita gente fala sobre ${topic} como se existisse apenas uma explicação. Não é tão simples.`,
      ],

      storytelling: [
        `Tudo começa com uma informação sobre ${topic} que parece clara, até que os detalhes começam a aparecer.`,
        `Uma frase sobre ${topic} ganhou atenção, mas o contexto por trás dela é a parte mais importante.`,
      ],

      humor: [
        `Quando o assunto é ${topic}, todo mundo parece especialista até alguém pedir uma explicação completa.`,
        `${capitalize(topic)} é aquele assunto em que três pessoas falam, cinco versões aparecem e ninguém sabe onde começou.`,
      ],
    };

  const options =
    hooks[tone] ??
    hooks.curioso;

  return selectDeterministic(
    options,
    context.topic,
  );
}

function buildDefaultHook(
  topic: string,
): string {
  return `Antes de tirar uma conclusão sobre ${topic}, vale entender o contexto completo.`;
}

function normalizeSceneCount(
  scenes: SceneDraft[],
  desiredCount: number,
  context: TopicContext,
): SceneDraft[] {
  const normalized =
    [...scenes];

  const additionalScenes:
    SceneDraft[] = [
      {
        name:
          'Pergunta do público',
        visual:
          `Pessoa lendo comentários e perguntas sobre ${context.topic} em um celular, tela sem marcas visíveis, enquadramento vertical.`,
        voiceover:
          `Uma boa análise também considera as dúvidas do público, porque elas mostram quais partes ainda não foram explicadas com clareza.`,
      },
      {
        name:
          'Verificação',
        visual:
          `Pessoa verificando diferentes páginas e anotações sobre ${context.topic}, ambiente de trabalho, plano vertical.`,
        voiceover:
          `Quando versões diferentes entram em conflito, o melhor caminho é verificar a origem e procurar informações que possam ser confirmadas.`,
      },
      {
        name:
          'Consequência',
        visual:
          `Pessoa refletindo sobre decisões relacionadas a ${context.topic}, ambiente coerente com tecnologia e informação.`,
        voiceover:
          `Entender esse contexto evita decisões baseadas apenas em medo, entusiasmo ou frases retiradas de uma explicação maior.`,
      },
    ];

  for (
    const additional of
    additionalScenes
  ) {
    if (
      normalized.length >=
      desiredCount
    ) {
      break;
    }

    normalized.splice(
      Math.max(
        normalized.length - 1,
        1,
      ),
      0,
      additional,
    );
  }

  return normalized.slice(
    0,
    Math.max(
      4,
      desiredCount,
    ),
  );
}

function appendCtaToLastScene(
  scenes:
    FacelessScript['scenes'],
  cta: string,
): FacelessScript['scenes'] {
  if (
    scenes.length === 0
  ) {
    return scenes;
  }

  return scenes.map(
    (scene, index) => {
      if (
        index !==
        scenes.length - 1
      ) {
        return scene;
      }

      const current =
        cleanText(
          scene.voiceover,
        );

      const cleanCta =
        cleanText(cta);

      return {
        ...scene,
        name:
          'Conclusão e CTA',
        voiceover:
          `${current} ${cleanCta}`.trim(),
      };
    },
  );
}

function buildTitle(
  context: TopicContext,
  tone:
    GenerateFacelessDto['tone'],
): string {
  const topic =
    context.topic;

  const titles:
    Record<
      GenerateFacelessDto['tone'],
      string[]
    > = {
      curioso: [
        `O detalhe que muda a forma de entender ${topic}`,
        `O que precisa ser analisado antes de falar sobre ${topic}`,
      ],

      educativo: [
        `Como entender ${topic} sem perder o contexto`,
        `${capitalize(topic)}: informação, interpretação e contexto`,
      ],

      polêmico: [
        `Por que o debate sobre ${topic} está incompleto`,
        `O problema nas conclusões rápidas sobre ${topic}`,
      ],

      storytelling: [
        `Como uma informação sobre ${topic} ganha força`,
        `A história por trás do debate sobre ${topic}`,
      ],

      humor: [
        `${capitalize(topic)}: quando todo mundo tem uma versão`,
        `Por que explicar ${topic} virou uma confusão`,
      ],
    };

  return selectDeterministic(
    titles[tone] ??
      titles.curioso,
    context.subject,
  );
}

function buildHookVisual(
  context: TopicContext,
): string {
  return `Pessoa observando informações relacionadas a ${context.topic} em uma tela, expressão de atenção, ambiente moderno, vídeo vertical, sem texto incorporado.`;
}

function buildContextVisual(
  context: TopicContext,
): string {
  return `Sequência de notícias, vídeos e publicações relacionadas a ${context.topic} sendo analisadas em um computador, enquadramento vertical.`;
}

function buildAnalysisVisual(
  context: TopicContext,
): string {
  return `Pessoa organizando fatos e interpretações sobre ${context.topic} em anotações separadas, mesa de trabalho, plano vertical.`;
}

function buildPracticalVisual(
  context: TopicContext,
): string {
  return `Situação cotidiana mostrando como ${context.topic} pode influenciar decisões ou opiniões, pessoas reais, iluminação natural, formato vertical.`;
}

function buildComparisonVisual(
  context: TopicContext,
): string {
  return `Comparação visual entre duas interpretações diferentes de ${context.topic}, duas telas ou duas pessoas analisando o mesmo assunto.`;
}

function buildConclusionVisual(
  context: TopicContext,
): string {
  return `Pessoa concluindo uma análise sobre ${context.topic}, fechando anotações e olhando para a câmera, composição vertical e limpa.`;
}

function buildCaptions(
  scenes:
    FacelessScript['scenes'],
): string {
  const blocks:
    string[] = [];

  let cursor = 0;
  let index = 1;

  for (
    const scene of scenes
  ) {
    const fragments =
      splitCaptionText(
        scene.voiceover,
      );

    const fragmentDuration =
      scene.durationSec /
      Math.max(
        fragments.length,
        1,
      );

    for (
      const fragment of fragments
    ) {
      const start =
        formatSrt(cursor);

      cursor +=
        fragmentDuration;

      const end =
        formatSrt(cursor);

      blocks.push(
        [
          String(index),
          `${start} --> ${end}`,
          fragment,
          '',
        ].join('\n'),
      );

      index += 1;
    }
  }

  return blocks.join('\n');
}

function splitCaptionText(
  text: string,
): string[] {
  const clean =
    cleanText(text);

  if (!clean) {
    return [];
  }

  const words =
    clean.split(/\s+/);

  const fragments:
    string[] = [];

  let current:
    string[] = [];

  for (
    const word of words
  ) {
    current.push(word);

    const punctuation =
      /[.!?;:]$/.test(word);

    if (
      current.length >= 6 ||
      (
        punctuation &&
        current.length >= 3
      )
    ) {
      fragments.push(
        current.join(' '),
      );

      current = [];
    }
  }

  if (
    current.length > 0
  ) {
    if (
      current.length <= 2 &&
      fragments.length > 0
    ) {
      fragments[
        fragments.length - 1
      ] =
        `${fragments[
          fragments.length - 1
        ]} ${current.join(' ')}`;
    } else {
      fragments.push(
        current.join(' '),
      );
    }
  }

  return fragments;
}

function formatSrt(
  seconds: number,
): string {
  const safe =
    Math.max(
      seconds,
      0,
    );

  const hours =
    Math.floor(
      safe / 3600,
    );

  const minutes =
    Math.floor(
      (safe % 3600) /
        60,
    );

  const wholeSeconds =
    Math.floor(
      safe % 60,
    );

  const milliseconds =
    Math.round(
      (safe -
        Math.floor(safe)) *
        1000,
    );

  return [
    String(hours).padStart(
      2,
      '0',
    ),
    String(minutes).padStart(
      2,
      '0',
    ),
    String(wholeSeconds).padStart(
      2,
      '0',
    ),
  ].join(':') +
    `,${String(milliseconds).padStart(3, '0')}`;
}

function buildHashtags(
  niche: string,
  tone:
    GenerateFacelessDto['tone'],
  keywords: string[],
): string[] {
  const base =
    new Set<string>([
      'conteudo',
      'informacao',
      'curiosidade',
      'shorts',
      'reels',
    ]);

  const nicheTag =
    normalizeHashtag(
      niche,
    );

  if (nicheTag) {
    base.add(
      nicheTag,
    );
  }

  for (
    const keyword of keywords
  ) {
    const tag =
      normalizeHashtag(
        keyword,
      );

    if (
      tag &&
      tag.length <= 30
    ) {
      base.add(tag);
    }
  }

  if (
    tone === 'educativo'
  ) {
    base.add(
      'aprenda',
    );
  }

  if (
    tone === 'polêmico'
  ) {
    base.add(
      'debate',
    );
  }

  if (
    tone ===
    'storytelling'
  ) {
    base.add(
      'historia',
    );
  }

  if (
    tone === 'humor'
  ) {
    base.add(
      'humor',
    );
  }

  return Array.from(
    base,
  ).slice(0, 10);
}

function buildCta(
  tone:
    GenerateFacelessDto['tone'],
  topic: string,
): string {
  const ctas:
    Record<
      GenerateFacelessDto['tone'],
      string
    > = {
      curioso:
        `Qual detalhe sobre ${topic} você considera mais importante? Comente abaixo.`,

      educativo:
        `Salve este vídeo para revisar os pontos principais e compartilhe com quem acompanha esse assunto.`,

      polêmico:
        `Você concorda com essa análise ou vê o assunto de outra forma? Deixe sua opinião.`,

      storytelling:
        `Se você quer acompanhar outras histórias explicadas com contexto, siga o perfil.`,

      humor:
        `Agora conta nos comentários qual foi a explicação mais confusa que você já ouviu sobre esse tema.`,
    };

  return (
    ctas[tone] ??
    ctas.curioso
  );
}

function buildKeywords(
  context: TopicContext,
): string[] {
  return uniqueStrings([
    context.topic,
    context.subject,
    ...context.keywords,
    `${context.topic} explicação`,
    `${context.topic} contexto`,
    `${context.topic} análise`,
    `${context.topic} informações`,
  ]).slice(0, 12);
}

function buildThumbnail(
  context: TopicContext,
  tone:
    GenerateFacelessDto['tone'],
): string {
  const shortText =
    buildThumbnailText(
      context.topic,
      tone,
    );

  return [
    `Miniatura vertical relacionada a ${context.topic}.`,
    'Um único elemento principal em destaque.',
    'Fundo limpo e com contraste.',
    `Texto curto: "${shortText}".`,
    'Sem excesso de setas, emojis ou elementos decorativos.',
  ].join(' ');
}

function buildThumbnailText(
  topic: string,
  tone:
    GenerateFacelessDto['tone'],
): string {
  const shortTopic =
    topic
      .split(/\s+/)
      .slice(0, 3)
      .join(' ');

  switch (tone) {
    case 'educativo':
      return `ENTENDA ${shortTopic}`.toUpperCase();

    case 'polêmico':
      return `O DEBATE REAL`.toUpperCase();

    case 'storytelling':
      return `COMO COMEÇOU`.toUpperCase();

    case 'humor':
      return `QUE CONFUSÃO`.toUpperCase();

    case 'curioso':
    default:
      return `O DETALHE`.toUpperCase();
  }
}

function extractTopic(
  title: string,
  tags: string[],
  niche?: string,
): string {
  const cleanNiche =
    cleanText(
      niche ??
        '',
    );

  const titleWords =
    tokenizeMeaningfulWords(
      title,
    );

  const tagWords =
    tags.flatMap(
      (tag: string) =>
        tokenizeMeaningfulWords(
          tag,
        ),
    );

  const words =
    uniqueStrings([
      ...titleWords,
      ...tagWords,
    ]);

  const topicFromTitle =
    words
      .slice(0, 6)
      .join(' ')
      .trim();

  if (
    topicFromTitle.length >=
    4
  ) {
    return topicFromTitle;
  }

  if (
    cleanNiche.length >= 3
  ) {
    return cleanNiche;
  }

  return 'este assunto';
}

function buildNaturalSubject(
  title: string,
  topic: string,
): string {
  const cleaned =
    cleanText(title)
      .replace(
        /\s+/g,
        ' ',
      )
      .trim();

  if (
    cleaned.length >= 8
  ) {
    return cleaned;
  }

  return topic;
}

function summarizeDescription(
  description: string,
  topic: string,
): string {
  const cleaned =
    cleanText(description)
      .replace(
        /https?:\/\/\S+/gi,
        '',
      )
      .replace(
        /#[\p{L}\p{N}_-]+/gu,
        '',
      )
      .trim();

  if (
    cleaned.length < 20
  ) {
    return '';
  }

  const firstSentence =
    cleaned.match(
      /[^.!?]+[.!?]?/,
    )?.[0] ??
    cleaned;

  const limited =
    limitWords(
      firstSentence,
      22,
    );

  if (
    normalizeComparison(
      limited,
    ) ===
    normalizeComparison(
      topic,
    )
  ) {
    return '';
  }

  return limited
    .replace(
      /^[,.;:\s]+/,
      '',
    )
    .replace(
      /[.!?]+$/,
      '',
    )
    .trim();
}

function cleanSourceTitle(
  title: string,
): string {
  return cleanText(title)
    .replace(
      /\[[^\]]*]/g,
      ' ',
    )
    .replace(
      /\([^)]*\)/g,
      ' ',
    )
    .replace(
      /\b(shorts?|reels?|tiktok|vídeo viral|video viral)\b/gi,
      ' ',
    )
    .replace(
      /[|•]+/g,
      ' ',
    )
    .replace(
      /\s+/g,
      ' ',
    )
    .trim();
}

function tokenizeMeaningfulWords(
  value: string,
): string[] {
  const stopWords =
    new Set<string>([
      'a',
      'o',
      'as',
      'os',
      'de',
      'da',
      'do',
      'das',
      'dos',
      'em',
      'no',
      'na',
      'nos',
      'nas',
      'para',
      'por',
      'com',
      'sem',
      'sobre',
      'entre',
      'que',
      'e',
      'ou',
      'mas',
      'um',
      'uma',
      'uns',
      'umas',
      'se',
      'ao',
      'aos',
      'como',
      'porque',
      'porquê',
      'qual',
      'quais',
      'quem',
      'onde',
      'quando',
      'isso',
      'isto',
      'esse',
      'essa',
      'este',
      'esta',
      'foi',
      'ser',
      'está',
      'estao',
      'estão',
      'vai',
      'the',
      'and',
      'for',
      'with',
      'from',
      'this',
      'that',
      'what',
      'why',
      'how',
      'your',
      'you',
      'are',
      'was',
      'were',
      'has',
      'have',
    ]);

  return value
    .toLowerCase()
    .replace(
      /[^\p{L}\p{N}\s-]/gu,
      ' ',
    )
    .split(/\s+/)
    .map(
      (word: string) =>
        word.trim(),
    )
    .filter(
      (word: string) =>
        word.length >= 3 &&
        !stopWords.has(word),
    );
}

function durationConfig(
  duration:
    GenerateFacelessDto['targetDuration'],
): DurationConfig {
  switch (duration) {
    case 'short':
      return {
        totalSec: 48,
        sceneCount: 6,
        wordsPerScene: 24,
      };

    case 'medium':
      return {
        totalSec: 180,
        sceneCount: 8,
        wordsPerScene: 48,
      };

    case 'long':
      return {
        totalSec: 480,
        sceneCount: 10,
        wordsPerScene: 80,
      };

    default:
      return {
        totalSec: 48,
        sceneCount: 6,
        wordsPerScene: 24,
      };
  }
}

function removeRepeatedDrafts(
  scenes: SceneDraft[],
): SceneDraft[] {
  const accepted:
    SceneDraft[] = [];

  const previous:
    string[] = [];

  for (
    const scene of scenes
  ) {
    const normalized =
      normalizeComparison(
        scene.voiceover,
      );

    const duplicate =
      previous.some(
        (item: string) =>
          similarity(
            normalized,
            item,
          ) >= 0.65,
      );

    if (
      duplicate ||
      !normalized
    ) {
      continue;
    }

    accepted.push(scene);
    previous.push(
      normalized,
    );
  }

  return accepted;
}

function similarity(
  first: string,
  second: string,
): number {
  const firstWords =
    new Set(
      first.split(' '),
    );

  const secondWords =
    new Set(
      second.split(' '),
    );

  if (
    firstWords.size === 0 ||
    secondWords.size === 0
  ) {
    return 0;
  }

  let intersection = 0;

  for (
    const word of
    firstWords
  ) {
    if (
      secondWords.has(word)
    ) {
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

function limitWords(
  text: string,
  maxWords: number,
): string {
  const words =
    cleanText(text)
      .split(/\s+/)
      .filter(Boolean);

  if (
    words.length <=
    maxWords
  ) {
    return words.join(' ');
  }

  return `${words
    .slice(0, maxWords)
    .join(' ')
    .replace(
      /[,;:]$/,
      '',
    )}.`;
}

function normalizeHashtag(
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
      /[^a-z0-9]/g,
      '',
    )
    .slice(0, 40);
}

function selectDeterministic(
  values: string[],
  seed: string,
): string {
  if (
    values.length === 0
  ) {
    return '';
  }

  let hash = 0;

  for (
    const character of seed
  ) {
    hash =
      (
        hash * 31 +
        character.charCodeAt(0)
      ) >>> 0;
  }

  return values[
    hash % values.length
  ] ?? values[0] ?? '';
}

function uniqueStrings(
  values: string[],
): string[] {
  const seen =
    new Set<string>();

  const result:
    string[] = [];

  for (
    const value of values
  ) {
    const cleaned =
      cleanText(value);

    const normalized =
      normalizeComparison(
        cleaned,
      );

    if (
      !cleaned ||
      !normalized ||
      seen.has(normalized)
    ) {
      continue;
    }

    seen.add(
      normalized,
    );

    result.push(
      cleaned,
    );
  }

  return result;
}

function normalizeComparison(
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
    .replace(
      /\s+/g,
      ' ',
    )
    .trim();
}

function capitalize(
  value: string,
): string {
  const clean =
    cleanText(value);

  if (!clean) {
    return '';
  }

  return (
    clean.charAt(0).toUpperCase() +
    clean.slice(1)
  );
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
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,
      '',
    )
    .replace(
      /\s+/g,
      ' ',
    )
    .replace(
      /\s+([,.!?;:])/g,
      '$1',
    )
    .trim();
}
