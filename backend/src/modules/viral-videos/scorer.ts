/**
 * Motor de pontuação de viralidade.
 *
 * O score final varia de 0 a 100 e combina:
 *
 * - velocidade de visualizações;
 * - taxa de engajamento;
 * - comentários por hora;
 * - recência;
 * - desempenho em relação ao tamanho do canal;
 * - volume absoluto;
 * - qualidade dos metadados.
 *
 * Observação:
 * viewsPerHour, likesPerHour e commentsPerHour representam
 * médias desde a publicação. A aceleração real entre períodos
 * será adicionada quando implementarmos snapshots históricos.
 */

export interface ViralScoreInput {
  platform?: 'YOUTUBE' | 'TIKTOK' | 'REDDIT';

  views: number;
  likes?: number;
  comments?: number;

  publishedAt: Date;

  ageHours?: number;

  viewsPerHour?: number;
  likesPerHour?: number;
  commentsPerHour?: number;

  engagementRate?: number;
  likeRate?: number;
  commentRate?: number;

  channelSubscribers?: number;
  channelTotalViews?: number;
  channelVideoCount?: number;
  channelOutperformance?: number;

  durationSec?: number;

  tags?: string[];
  hashtags?: string[];
  description?: string;
  title?: string;

  topComments?: Array<{
    text: string;
    likes: number;
  }>;
}

export interface ViralScoreBreakdown {
  score: number;

  components: {
    viewVelocity: number;
    engagement: number;
    commentVelocity: number;
    recency: number;
    channelOutperformance: number;
    absoluteReach: number;
    metadataQuality: number;
  };

  metrics: {
    ageHours: number;
    viewsPerHour: number;
    likesPerHour: number;
    commentsPerHour: number;
    engagementRate: number;
    likeRate: number;
    commentRate: number;
    channelOutperformance?: number;
  };

  signals: string[];
}

/**
 * Mantém compatibilidade com o service atual.
 *
 * O service pode continuar chamando:
 *
 * computeViralScore(video)
 */
export function computeViralScore(
  video: ViralScoreInput,
): number {
  return computeViralScoreBreakdown(
    video,
  ).score;
}

/**
 * Retorna o score completo com componentes,
 * métricas normalizadas e sinais editoriais.
 */
export function computeViralScoreBreakdown(
  video: ViralScoreInput,
): ViralScoreBreakdown {
  const views = safeNumber(
    video.views,
  );

  const likes = safeNumber(
    video.likes,
  );

  const comments = safeNumber(
    video.comments,
  );

  const ageHours =
    resolveAgeHours(video);

  const viewsPerHour =
    resolveRate(
      video.viewsPerHour,
      views,
      ageHours,
    );

  const likesPerHour =
    resolveRate(
      video.likesPerHour,
      likes,
      ageHours,
    );

  const commentsPerHour =
    resolveRate(
      video.commentsPerHour,
      comments,
      ageHours,
    );

  const likeRate =
    resolveRatio(
      video.likeRate,
      likes,
      views,
    );

  const commentRate =
    resolveRatio(
      video.commentRate,
      comments,
      views,
    );

  const engagementRate =
    resolveEngagementRate(
      video.engagementRate,
      likes,
      comments,
      views,
    );

  const channelOutperformance =
    resolveChannelOutperformance(
      video,
      views,
    );

  const components = {
    viewVelocity:
      scoreViewVelocity(
        viewsPerHour,
        ageHours,
      ),

    engagement:
      scoreEngagement(
        engagementRate,
        likeRate,
        commentRate,
      ),

    commentVelocity:
      scoreCommentVelocity(
        commentsPerHour,
        commentRate,
      ),

    recency:
      scoreRecency(
        ageHours,
      ),

    channelOutperformance:
      scoreChannelOutperformance(
        channelOutperformance,
      ),

    absoluteReach:
      scoreAbsoluteReach(
        views,
      ),

    metadataQuality:
      scoreMetadataQuality(
        video,
      ),
  };

  const rawScore =
    components.viewVelocity +
    components.engagement +
    components.commentVelocity +
    components.recency +
    components.channelOutperformance +
    components.absoluteReach +
    components.metadataQuality;

  const score = Math.round(
    clamp(
      rawScore,
      0,
      100,
    ),
  );

  return {
    score,

    components: {
      viewVelocity:
        roundScore(
          components.viewVelocity,
        ),

      engagement:
        roundScore(
          components.engagement,
        ),

      commentVelocity:
        roundScore(
          components.commentVelocity,
        ),

      recency:
        roundScore(
          components.recency,
        ),

      channelOutperformance:
        roundScore(
          components.channelOutperformance,
        ),

      absoluteReach:
        roundScore(
          components.absoluteReach,
        ),

      metadataQuality:
        roundScore(
          components.metadataQuality,
        ),
    },

    metrics: {
      ageHours:
        roundMetric(
          ageHours,
        ),

      viewsPerHour:
        roundMetric(
          viewsPerHour,
        ),

      likesPerHour:
        roundMetric(
          likesPerHour,
        ),

      commentsPerHour:
        roundMetric(
          commentsPerHour,
        ),

      engagementRate:
        roundMetric(
          engagementRate,
          6,
        ),

      likeRate:
        roundMetric(
          likeRate,
          6,
        ),

      commentRate:
        roundMetric(
          commentRate,
          6,
        ),

      channelOutperformance:
        channelOutperformance ===
        undefined
          ? undefined
          : roundMetric(
              channelOutperformance,
              4,
            ),
    },

    signals:
      buildSignals({
        video,
        score,
        ageHours,
        views,
        viewsPerHour,
        engagementRate,
        commentsPerHour,
        channelOutperformance,
      }),
  };
}

/**
 * Até 25 pontos.
 *
 * A escala logarítmica evita que vídeos gigantes
 * dominem completamente os resultados.
 */
function scoreViewVelocity(
  viewsPerHour: number,
  ageHours: number,
): number {
  if (viewsPerHour <= 0) {
    return 0;
  }

  const base =
    logarithmicScore(
      viewsPerHour,
      25,
      6,
    );

  /*
   * Pequeno bônus para vídeos novos que já
   * apresentam velocidade relevante.
   */
  const earlyMomentumBonus =
    ageHours <= 6 &&
    viewsPerHour >= 500
      ? 2
      : ageHours <= 24 &&
          viewsPerHour >= 1_000
        ? 1
        : 0;

  return clamp(
    base +
      earlyMomentumBonus,
    0,
    25,
  );
}

/**
 * Até 20 pontos.
 *
 * Referências aproximadas:
 * - 1%: engajamento baixo/moderado
 * - 3%: bom
 * - 5%: forte
 * - 8% ou mais: excepcional
 */
function scoreEngagement(
  engagementRate: number,
  likeRate: number,
  commentRate: number,
): number {
  if (
    engagementRate <= 0
  ) {
    return 0;
  }

  const generalScore =
    normalizedScore(
      engagementRate,
      0.08,
      14,
    );

  const likeScore =
    normalizedScore(
      likeRate,
      0.06,
      4,
    );

  const commentScore =
    normalizedScore(
      commentRate,
      0.01,
      2,
    );

  return clamp(
    generalScore +
      likeScore +
      commentScore,
    0,
    20,
  );
}

/**
 * Até 10 pontos.
 *
 * Comentários são um sinal importante porque
 * normalmente exigem mais intenção do usuário
 * do que uma visualização ou curtida.
 */
function scoreCommentVelocity(
  commentsPerHour: number,
  commentRate: number,
): number {
  const velocityScore =
    commentsPerHour > 0
      ? logarithmicScore(
          commentsPerHour,
          7,
          4,
        )
      : 0;

  const rateScore =
    normalizedScore(
      commentRate,
      0.01,
      3,
    );

  return clamp(
    velocityScore +
      rateScore,
    0,
    10,
  );
}

/**
 * Até 15 pontos.
 */
function scoreRecency(
  ageHours: number,
): number {
  if (ageHours <= 1) {
    return 15;
  }

  if (ageHours <= 3) {
    return 14;
  }

  if (ageHours <= 6) {
    return 13;
  }

  if (ageHours <= 12) {
    return 12;
  }

  if (ageHours <= 24) {
    return 11;
  }

  if (ageHours <= 48) {
    return 9;
  }

  if (ageHours <= 72) {
    return 8;
  }

  if (ageHours <= 7 * 24) {
    return 6;
  }

  if (ageHours <= 14 * 24) {
    return 4;
  }

  if (ageHours <= 30 * 24) {
    return 2;
  }

  return 0;
}

/**
 * Até 15 pontos.
 *
 * Exemplos:
 * - 0,10: views equivalem a 10% dos inscritos
 * - 1,00: views equivalem ao total de inscritos
 * - 5,00: views equivalem a cinco vezes os inscritos
 */
function scoreChannelOutperformance(
  outperformance:
    | number
    | undefined,
): number {
  if (
    outperformance ===
      undefined ||
    outperformance <= 0
  ) {
    return 0;
  }

  if (
    outperformance >= 10
  ) {
    return 15;
  }

  if (
    outperformance >= 5
  ) {
    return 14;
  }

  if (
    outperformance >= 3
  ) {
    return 13;
  }

  if (
    outperformance >= 2
  ) {
    return 12;
  }

  if (
    outperformance >= 1
  ) {
    return 10;
  }

  if (
    outperformance >= 0.5
  ) {
    return 8;
  }

  if (
    outperformance >= 0.25
  ) {
    return 6;
  }

  if (
    outperformance >= 0.1
  ) {
    return 4;
  }

  if (
    outperformance >= 0.03
  ) {
    return 2;
  }

  return 1;
}

/**
 * Até 10 pontos.
 *
 * O alcance absoluto continua relevante,
 * mas tem peso menor que velocidade e engajamento.
 */
function scoreAbsoluteReach(
  views: number,
): number {
  if (views <= 0) {
    return 0;
  }

  return logarithmicScore(
    views,
    10,
    7,
  );
}

/**
 * Até 5 pontos.
 */
function scoreMetadataQuality(
  video: ViralScoreInput,
): number {
  let score = 0;

  const title =
    cleanText(
      video.title,
    );

  const description =
    cleanText(
      video.description,
    );

  const tags =
    uniqueStrings(
      video.tags ?? [],
    );

  const hashtags =
    uniqueStrings(
      video.hashtags ?? [],
    );

  const topComments =
    Array.isArray(
      video.topComments,
    )
      ? video.topComments
      : [];

  if (
    title.length >= 15
  ) {
    score += 1;
  }

  if (
    description.length >= 80
  ) {
    score += 1;
  }

  if (
    tags.length >= 3
  ) {
    score += 1;
  }

  if (
    hashtags.length >= 1
  ) {
    score += 1;
  }

  if (
    topComments.length >= 3
  ) {
    score += 1;
  }

  return clamp(
    score,
    0,
    5,
  );
}

function resolveAgeHours(
  video: ViralScoreInput,
): number {
  const informedAge =
    safeOptionalNumber(
      video.ageHours,
    );

  if (
    informedAge !==
      undefined &&
    informedAge > 0
  ) {
    return Math.max(
      informedAge,
      0.25,
    );
  }

  const publishedAt =
    video.publishedAt instanceof
      Date
      ? video.publishedAt
      : new Date(
          video.publishedAt,
        );

  const publishedTime =
    publishedAt.getTime();

  if (
    Number.isNaN(
      publishedTime,
    )
  ) {
    return 24;
  }

  return Math.max(
    (
      Date.now() -
      publishedTime
    ) /
      (
        60 *
        60 *
        1000
      ),
    0.25,
  );
}

function resolveRate(
  informedRate:
    | number
    | undefined,
  total: number,
  ageHours: number,
): number {
  const validRate =
    safeOptionalNumber(
      informedRate,
    );

  if (
    validRate !==
    undefined
  ) {
    return validRate;
  }

  if (
    ageHours <= 0
  ) {
    return 0;
  }

  return total /
    ageHours;
}

function resolveRatio(
  informedRatio:
    | number
    | undefined,
  numerator: number,
  denominator: number,
): number {
  const validRatio =
    safeOptionalNumber(
      informedRatio,
    );

  if (
    validRatio !==
    undefined
  ) {
    return validRatio;
  }

  if (
    denominator <= 0
  ) {
    return 0;
  }

  return numerator /
    denominator;
}

function resolveEngagementRate(
  informedRate:
    | number
    | undefined,
  likes: number,
  comments: number,
  views: number,
): number {
  const validRate =
    safeOptionalNumber(
      informedRate,
    );

  if (
    validRate !==
    undefined
  ) {
    return validRate;
  }

  if (views <= 0) {
    return 0;
  }

  return (
    likes +
    comments
  ) /
    views;
}

function resolveChannelOutperformance(
  video: ViralScoreInput,
  views: number,
): number | undefined {
  const informed =
    safeOptionalNumber(
      video.channelOutperformance,
    );

  if (
    informed !==
    undefined
  ) {
    return informed;
  }

  const subscribers =
    safeOptionalNumber(
      video.channelSubscribers,
    );

  if (
    subscribers ===
      undefined ||
    subscribers <= 0
  ) {
    return undefined;
  }

  return views /
    subscribers;
}

function buildSignals(input: {
  video: ViralScoreInput;
  score: number;
  ageHours: number;
  views: number;
  viewsPerHour: number;
  engagementRate: number;
  commentsPerHour: number;
  channelOutperformance?: number;
}): string[] {
  const signals:
    string[] = [];

  if (
    input.score >= 85
  ) {
    signals.push(
      'Potencial viral excepcional',
    );
  } else if (
    input.score >= 70
  ) {
    signals.push(
      'Forte potencial viral',
    );
  } else if (
    input.score >= 55
  ) {
    signals.push(
      'Tendência promissora',
    );
  }

  if (
    input.ageHours <= 6
  ) {
    signals.push(
      'Conteúdo muito recente',
    );
  } else if (
    input.ageHours <= 24
  ) {
    signals.push(
      'Publicado nas últimas 24 horas',
    );
  }

  if (
    input.viewsPerHour >=
    10_000
  ) {
    signals.push(
      'Velocidade extrema de visualizações',
    );
  } else if (
    input.viewsPerHour >=
    1_000
  ) {
    signals.push(
      'Alta velocidade de visualizações',
    );
  } else if (
    input.viewsPerHour >=
    200
  ) {
    signals.push(
      'Visualizações crescendo rapidamente',
    );
  }

  if (
    input.engagementRate >=
    0.08
  ) {
    signals.push(
      'Engajamento excepcional',
    );
  } else if (
    input.engagementRate >=
    0.04
  ) {
    signals.push(
      'Engajamento forte',
    );
  }

  if (
    input.commentsPerHour >=
    50
  ) {
    signals.push(
      'Discussão intensa nos comentários',
    );
  } else if (
    input.commentsPerHour >=
    10
  ) {
    signals.push(
      'Comentários crescendo rapidamente',
    );
  }

  if (
    input.channelOutperformance !==
      undefined &&
    input.channelOutperformance >=
      3
  ) {
    signals.push(
      'Vídeo muito acima do tamanho do canal',
    );
  } else if (
    input.channelOutperformance !==
      undefined &&
    input.channelOutperformance >=
      1
  ) {
    signals.push(
      'Vídeo superou a base de inscritos',
    );
  }

  const hashtags =
    uniqueStrings(
      input.video.hashtags ??
        [],
    );

  if (
    hashtags.length >= 3
  ) {
    signals.push(
      'Múltiplas hashtags identificadas',
    );
  }

  const topComments =
    Array.isArray(
      input.video.topComments,
    )
      ? input.video
          .topComments
      : [];

  if (
    topComments.length >= 3
  ) {
    signals.push(
      'Comentários disponíveis para enriquecer o roteiro',
    );
  }

  if (
    input.views >=
    1_000_000
  ) {
    signals.push(
      'Alcance superior a um milhão de visualizações',
    );
  }

  return uniqueStrings(
    signals,
  );
}

function logarithmicScore(
  value: number,
  maxPoints: number,
  divisor: number,
): number {
  if (
    value <= 0
  ) {
    return 0;
  }

  const score =
    (
      Math.log10(
        value +
          1,
      ) /
      divisor
    ) *
    maxPoints;

  return clamp(
    score,
    0,
    maxPoints,
  );
}

function normalizedScore(
  value: number,
  target: number,
  maxPoints: number,
): number {
  if (
    value <= 0 ||
    target <= 0
  ) {
    return 0;
  }

  return clamp(
    (
      value /
      target
    ) *
      maxPoints,
    0,
    maxPoints,
  );
}

function safeNumber(
  value: unknown,
): number {
  const number =
    Number(
      value ??
        0,
    );

  return Number.isFinite(
    number,
  )
    ? Math.max(
        number,
        0,
      )
    : 0;
}

function safeOptionalNumber(
  value: unknown,
): number | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  const number =
    Number(value);

  return Number.isFinite(
    number,
  )
    ? Math.max(
        number,
        0,
      )
    : undefined;
}

function cleanText(
  value: unknown,
): string {
  if (
    typeof value !==
    'string'
  ) {
    return '';
  }

  return value
    .replace(
      /\s+/g,
      ' ',
    )
    .trim();
}

function uniqueStrings(
  values: string[],
): string[] {
  const result:
    string[] = [];

  const seen =
    new Set<string>();

  for (
    const value of values
  ) {
    const cleaned =
      cleanText(value);

    const normalized =
      cleaned
        .normalize(
          'NFD',
        )
        .replace(
          /[\u0300-\u036f]/g,
          '',
        )
        .toLowerCase();

    if (
      !cleaned ||
      !normalized ||
      seen.has(
        normalized,
      )
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

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    Math.max(
      value,
      minimum,
    ),
    maximum,
  );
}

function roundScore(
  value: number,
): number {
  return Math.round(
    clamp(
      value,
      0,
      100,
    ) *
      100,
  ) /
    100;
}

function roundMetric(
  value: number,
  decimals = 2,
): number {
  const factor =
    10 ** decimals;

  return Math.round(
    value *
      factor,
  ) /
    factor;
}
