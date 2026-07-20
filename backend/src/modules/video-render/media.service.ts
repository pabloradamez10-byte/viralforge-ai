import path from 'node:path';

import {
  pexelsProvider,
  type PexelsVideo,
  type PexelsVideoFile,
} from './providers/pexels.provider.js';

export interface MediaSceneInput {
  order: number;
  name?: string;
  visual?: string;
  searchKeywords?: string[];
  voiceover?: string;
  durationSec: number;
}

export interface DownloadedSceneMedia {
  order: number;
  query: string;
  filePath: string;
  durationSec: number;
  source: 'PEXELS';
  sourceVideoId: number;
  sourcePageUrl: string;
  assessmentScore?: number;
  assessmentReasons?: string[];
}

export interface DownloadSceneMediaInput {
  scenes: MediaSceneInput[];
  outputDirectory: string;
}

type DomainId =
  | 'football'
  | 'technology'
  | 'work'
  | 'religion'
  | 'finance'
  | 'health'
  | 'travel'
  | 'food'
  | 'generic';

interface DomainProfile {
  id: DomainId;
  primary: string;
  anchors: string[];
  matches: string[];
  queries: string[];
  forbidden: string[];
}

interface SceneIntent {
  domain: DomainProfile;
  concreteTerms: string[];
  translatedTerms: string[];
  requiredAnchors: string[];
  forbiddenTerms: string[];
}

interface CandidateAssessment {
  score: number;
  reasons: string[];
  rejected: boolean;
}

interface MediaCandidate {
  video: PexelsVideo;
  query: string;
  queryPriority: number;
  score: number;
  assessment: CandidateAssessment;
}

const MIN_ACCEPTABLE_SCORE = 66;
const STRONG_SCORE = 82;
const MAX_QUERIES_PER_SCENE = 6;
const RESULTS_PER_QUERY = 24;

const DOMAIN_PROFILES: DomainProfile[] = [
  {
    id: 'football',
    primary: 'football soccer',
    anchors: ['football', 'soccer', 'stadium', 'player', 'match', 'fans', 'trophy'],
    matches: [
      'futebol', 'copa do mundo', 'copa', 'goleiro', 'gol', 'estadio', 'jogador',
      'penalti', 'selecao', 'campeonato', 'torcida', 'trofeu', 'soccer', 'football',
      'goalkeeper', 'world cup',
    ],
    queries: [
      'football players stadium crowd',
      'international football match fans',
      'world cup trophy celebration',
      'soccer team stadium action',
      'football history stadium archive',
    ],
    forbidden: [
      'fitness', 'waist', 'gym', 'telescope', 'police', 'prayer', 'church', 'cooking',
      'medical', 'office meeting',
    ],
  },
  {
    id: 'technology',
    primary: 'artificial intelligence technology',
    anchors: ['technology', 'computer', 'artificial intelligence', 'data', 'software'],
    matches: [
      'inteligencia artificial', 'ia', 'automacao', 'tecnologia', 'algoritmo',
      'robot', 'artificial intelligence', 'software', 'dados',
    ],
    queries: [
      'professional using artificial intelligence computer',
      'artificial intelligence office technology',
      'data analysis computer screen',
      'robotics automation workplace',
    ],
    forbidden: ['cooking', 'church', 'football match', 'hospital patient', 'beach travel'],
  },
  {
    id: 'work',
    primary: 'professional workplace',
    anchors: ['professional', 'office', 'workplace', 'computer', 'business'],
    matches: [
      'trabalho', 'emprego', 'carreira', 'profissao', 'empresa', 'escritorio',
      'workplace', 'job', 'career', 'business',
    ],
    queries: [
      'professional working computer office',
      'business team modern office',
      'employee working laptop',
      'modern workplace collaboration',
    ],
    forbidden: ['football match', 'church worship', 'hospital surgery', 'cooking kitchen'],
  },
  {
    id: 'religion',
    primary: 'church worship',
    anchors: ['church', 'worship', 'prayer', 'christian', 'service'],
    matches: [
      'igreja', 'cristao', 'crista', 'louvor', 'culto', 'fe', 'oracao',
      'worship', 'church', 'prayer',
    ],
    queries: [
      'church worship service',
      'people worshiping church',
      'church musician worship',
      'person praying church',
    ],
    forbidden: ['football match', 'fitness gym', 'cooking kitchen', 'medical surgery'],
  },
  {
    id: 'finance',
    primary: 'finance money',
    anchors: ['finance', 'money', 'investment', 'banking', 'charts'],
    matches: [
      'dinheiro', 'financa', 'investimento', 'economia', 'banco', 'money',
      'finance', 'investment',
    ],
    queries: [
      'financial analyst computer charts',
      'business finance data',
      'person managing money',
      'investment analysis office',
    ],
    forbidden: ['football match', 'church worship', 'cooking kitchen', 'hospital patient'],
  },
  {
    id: 'health',
    primary: 'healthcare medical',
    anchors: ['doctor', 'hospital', 'medical', 'healthcare', 'patient'],
    matches: [
      'saude', 'medico', 'hospital', 'doenca', 'tratamento', 'health', 'doctor',
      'medical', 'patient',
    ],
    queries: [
      'doctor hospital patient',
      'medical professional healthcare',
      'doctor analyzing results',
      'hospital technology',
    ],
    forbidden: ['football match', 'church worship', 'cooking restaurant', 'beach tourism'],
  },
  {
    id: 'travel',
    primary: 'travel tourism',
    anchors: ['travel', 'tourist', 'city', 'airport', 'destination'],
    matches: ['viagem', 'turismo', 'pais', 'cidade', 'aeroporto', 'travel', 'tourist'],
    queries: [
      'traveler city destination',
      'tourist exploring city',
      'airport traveler',
      'travel landscape',
    ],
    forbidden: ['hospital surgery', 'church worship', 'football training', 'office meeting'],
  },
  {
    id: 'food',
    primary: 'food cooking',
    anchors: ['food', 'cooking', 'kitchen', 'chef', 'restaurant'],
    matches: ['comida', 'receita', 'cozinha', 'restaurante', 'food', 'cooking', 'chef'],
    queries: [
      'chef cooking kitchen',
      'food preparation restaurant',
      'person cooking meal',
      'restaurant kitchen',
    ],
    forbidden: ['football match', 'church worship', 'hospital surgery', 'office meeting'],
  },
];

const GENERIC_DOMAIN: DomainProfile = {
  id: 'generic',
  primary: 'documentary people real life',
  anchors: [],
  matches: [],
  queries: [],
  forbidden: [],
};

export class MediaService {
  private readonly usedVideoIds = new Set<number>();
  private previousCandidate?: MediaCandidate;
  private previousIntent?: SceneIntent;

  async downloadMediaForScenes(
    input: DownloadSceneMediaInput,
  ): Promise<DownloadedSceneMedia[]> {
    if (!Array.isArray(input.scenes) || input.scenes.length === 0) {
      throw new Error('Nenhuma cena foi informada para buscar mídias.');
    }

    const outputDirectory = path.resolve(input.outputDirectory);
    const orderedScenes = [...input.scenes].sort(
      (first, second) => first.order - second.order,
    );

    const downloaded: DownloadedSceneMedia[] = [];
    this.usedVideoIds.clear();
    this.previousCandidate = undefined;
    this.previousIntent = undefined;

    for (const scene of orderedScenes) {
      const intent = this.buildSceneIntent(scene);
      const queries = this.buildSearchQueries(scene, intent);
      const candidate = await this.findBestCandidate(queries, scene, intent);

      if (!candidate) {
        throw new Error(
          [
            `Nenhuma mídia coerente foi encontrada para a cena ${scene.order}.`,
            `Consultas tentadas: ${queries.join(' | ')}`,
          ].join('\n'),
        );
      }

      const sceneDirectory = path.join(
        outputDirectory,
        `scene-${String(scene.order).padStart(3, '0')}`,
      );

      const filePath = await pexelsProvider.download(candidate.video, sceneDirectory);
      this.usedVideoIds.add(candidate.video.id);

      console.info('✅ MEDIA ASSESSMENT', {
        sceneOrder: scene.order,
        domain: intent.domain.id,
        query: candidate.query,
        score: candidate.score,
        reasons: candidate.assessment.reasons,
        sourceVideoId: candidate.video.id,
      });

      downloaded.push({
        order: scene.order,
        query: candidate.query,
        filePath,
        durationSec: Math.max(scene.durationSec, 1),
        source: 'PEXELS',
        sourceVideoId: candidate.video.id,
        sourcePageUrl: candidate.video.url,
        assessmentScore: candidate.score,
        assessmentReasons: candidate.assessment.reasons,
      });

      this.previousCandidate = candidate;
      this.previousIntent = intent;
    }

    return downloaded;
  }

  async searchAndDownloadSingleVideo(
    keywords: string[],
    outputDirectory: string,
  ): Promise<string> {
    const cleanedKeywords = keywords
      .map((keyword) => this.cleanText(keyword))
      .filter((keyword) => keyword.length > 0);

    if (cleanedKeywords.length === 0) {
      throw new Error('Nenhuma palavra-chave válida foi informada para buscar mídia.');
    }

    const query = cleanedKeywords.slice(0, 5).join(' ');
    const videos = await pexelsProvider.search(query, 20);
    const selected = videos
      .map((video) => ({
        video,
        score: this.calculateTechnicalScore(video, 8, 0),
      }))
      .sort((first, second) => second.score - first.score)[0]?.video;

    if (!selected) {
      throw new Error(`Nenhum vídeo encontrado no Pexels para "${query}".`);
    }

    return pexelsProvider.download(selected, outputDirectory);
  }

  private async findBestCandidate(
    queries: string[],
    scene: MediaSceneInput,
    intent: SceneIntent,
  ): Promise<MediaCandidate | undefined> {
    const candidates: MediaCandidate[] = [];
    const limitedQueries = queries.slice(0, MAX_QUERIES_PER_SCENE);

    for (let queryIndex = 0; queryIndex < limitedQueries.length; queryIndex += 1) {
      const query = limitedQueries[queryIndex];
      if (!query) continue;

      try {
        const videos = await pexelsProvider.search(query, RESULTS_PER_QUERY);

        for (const video of videos) {
          if (this.usedVideoIds.has(video.id)) continue;

          const technicalScore = this.calculateTechnicalScore(
            video,
            scene.durationSec,
            queryIndex,
          );
          const assessment = this.assessCandidate(
            query,
            scene,
            intent,
            technicalScore,
          );

          if (assessment.rejected) continue;

          candidates.push({
            video,
            query,
            queryPriority: queryIndex,
            score: assessment.score,
            assessment,
          });
        }

        const strongCandidate = candidates.some(
          (candidate) =>
            candidate.queryPriority === queryIndex && candidate.score >= STRONG_SCORE,
        );

        if (strongCandidate && queryIndex <= 1) break;
      } catch (error: unknown) {
        console.warn(
          `⚠️ Falha na busca de mídia para "${query}".`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    const ranked = candidates.sort((first, second) => second.score - first.score);
    const best = ranked[0];

    if (!best || best.score < MIN_ACCEPTABLE_SCORE) {
      console.warn('⚠️ MEDIA REJECTED', {
        sceneOrder: scene.order,
        bestScore: best?.score,
        candidateCount: ranked.length,
        queries: limitedQueries,
      });
      return undefined;
    }

    return best;
  }

  private assessCandidate(
    query: string,
    scene: MediaSceneInput,
    intent: SceneIntent,
    technicalScore: number,
  ): CandidateAssessment {
    let score = technicalScore;
    const reasons: string[] = [`technical:${Math.round(technicalScore)}`];
    const normalizedQuery = this.normalizeComparison(query);
    const queryTokens = new Set(normalizedQuery.split(/\s+/).filter(Boolean));

    const anchorHits = intent.requiredAnchors.filter((anchor) =>
      normalizedQuery.includes(this.normalizeComparison(anchor)),
    );
    const concreteHits = intent.translatedTerms.filter((term) =>
      normalizedQuery.includes(this.normalizeComparison(term)),
    );
    const forbiddenHits = intent.forbiddenTerms.filter((term) =>
      normalizedQuery.includes(this.normalizeComparison(term)),
    );

    if (intent.domain.id !== 'generic') {
      if (anchorHits.length > 0) {
        score += Math.min(anchorHits.length * 7, 21);
        reasons.push(`domain-anchor:+${Math.min(anchorHits.length * 7, 21)}`);
      } else {
        score -= 24;
        reasons.push('missing-domain-anchor:-24');
      }
    }

    if (concreteHits.length > 0) {
      score += Math.min(concreteHits.length * 4, 16);
      reasons.push(`scene-terms:+${Math.min(concreteHits.length * 4, 16)}`);
    } else if (intent.translatedTerms.length > 0) {
      score -= 10;
      reasons.push('missing-scene-terms:-10');
    }

    if (forbiddenHits.length > 0) {
      score -= 50;
      reasons.push(`forbidden:${forbiddenHits.join(',')}:-50`);
    }

    if (this.isAmbiguousQuery(normalizedQuery, intent)) {
      score -= 20;
      reasons.push('ambiguous-query:-20');
    }

    const continuity = this.calculateContinuityScore(queryTokens, intent);
    score += continuity.score;
    reasons.push(...continuity.reasons);

    const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
    const rejected =
      forbiddenHits.length > 0 ||
      normalizedScore < MIN_ACCEPTABLE_SCORE ||
      (intent.domain.id !== 'generic' && anchorHits.length === 0);

    return {
      score: normalizedScore,
      reasons,
      rejected,
    };
  }

  private calculateContinuityScore(
    queryTokens: Set<string>,
    intent: SceneIntent,
  ): { score: number; reasons: string[] } {
    if (!this.previousCandidate || !this.previousIntent) {
      return { score: 3, reasons: ['opening-scene:+3'] };
    }

    let score = 0;
    const reasons: string[] = [];
    const previousTokens = new Set(
      this.normalizeComparison(this.previousCandidate.query)
        .split(/\s+/)
        .filter(Boolean),
    );
    const overlap = [...queryTokens].filter((token) => previousTokens.has(token)).length;

    if (intent.domain.id === this.previousIntent.domain.id) {
      score += 8;
      reasons.push('same-domain:+8');
    } else if (
      intent.domain.id !== 'generic' &&
      this.previousIntent.domain.id !== 'generic'
    ) {
      score -= 12;
      reasons.push('domain-jump:-12');
    }

    if (overlap >= 2) {
      score += 6;
      reasons.push('visual-continuity:+6');
    } else if (overlap === 0) {
      score -= 5;
      reasons.push('low-continuity:-5');
    }

    return { score, reasons };
  }

  private buildSceneIntent(scene: MediaSceneInput): SceneIntent {
    const sourceText = [
      ...(scene.searchKeywords ?? []),
      scene.visual,
      scene.voiceover,
      scene.name,
    ]
      .filter(Boolean)
      .join(' ');

    const domain = this.detectDomain(sourceText);
    const concreteTerms = this.extractConcreteTerms(sourceText);
    const translatedTerms = this.uniqueStrings(
      concreteTerms.map((term) => this.translateCommonPhrase(term)),
    );

    return {
      domain,
      concreteTerms,
      translatedTerms,
      requiredAnchors: domain.anchors,
      forbiddenTerms: domain.forbidden,
    };
  }

  private buildSearchQueries(
    scene: MediaSceneInput,
    intent: SceneIntent,
  ): string[] {
    const explicitKeywords = Array.isArray(scene.searchKeywords)
      ? scene.searchKeywords
          .map((keyword) => this.cleanText(keyword))
          .filter((keyword) => keyword.length > 0)
      : [];
    const queries: string[] = [];

    for (const keyword of explicitKeywords) {
      const translated = this.normalizeSearchQuery(
        `${intent.domain.primary} ${this.translateCommonPhrase(keyword)}`,
      );
      if (translated) queries.push(translated);
    }

    if (intent.translatedTerms.length > 0) {
      queries.push(
        this.normalizeSearchQuery(
          [intent.domain.primary, ...intent.translatedTerms.slice(0, 4)].join(' '),
        ),
      );
    }

    for (const fallbackQuery of intent.domain.queries) {
      queries.push(this.normalizeSearchQuery(fallbackQuery));
    }

    if (intent.translatedTerms.length > 0) {
      queries.push(
        this.normalizeSearchQuery(intent.translatedTerms.slice(0, 6).join(' ')),
      );
    }

    const uniqueQueries = this.uniqueStrings(queries).filter(
      (query) => query.length >= 3 && !this.isAbstractQuery(query),
    );

    if (uniqueQueries.length === 0) {
      throw new Error(
        `A cena ${scene.order} não possui informações visuais concretas suficientes para buscar mídia.`,
      );
    }

    return uniqueQueries;
  }

  private detectDomain(value: string): DomainProfile {
    const normalized = this.normalizeComparison(value);
    let best = GENERIC_DOMAIN;
    let bestScore = 0;

    for (const domain of DOMAIN_PROFILES) {
      const score = domain.matches.reduce(
        (total, term) =>
          normalized.includes(this.normalizeComparison(term)) ? total + 1 : total,
        0,
      );
      if (score > bestScore) {
        bestScore = score;
        best = domain;
      }
    }

    return best;
  }

  private extractConcreteTerms(value: string): string[] {
    const stopWords = new Set([
      'a', 'o', 'as', 'os', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'em',
      'no', 'na', 'nos', 'nas', 'para', 'por', 'com', 'sem', 'sobre', 'entre',
      'que', 'como', 'porque', 'quando', 'onde', 'isso', 'isto', 'esse', 'essa',
      'este', 'esta', 'mais', 'menos', 'muito', 'muita', 'pouco', 'pode', 'podem',
      'deve', 'devem', 'foi', 'era', 'ser', 'estao', 'tem', 'ter', 'faz', 'fazer',
      'mostra', 'mostrar', 'pessoa', 'cena', 'imagem', 'video', 'vertical', 'plano',
      'enquadramento', 'iluminacao', 'natural', 'moderno', 'moderna', 'relacionado',
      'relacionada', 'assunto', 'tema', 'contexto', 'detalhe', 'historia', 'titulo',
      'momento', 'evento', 'impactante', 'reflexao', 'informacao', 'analise',
      'conclusao', 'fato', 'coisa', 'mundo',
    ]);

    return this.normalizeComparison(value)
      .split(/\s+/)
      .filter((word) => word.length >= 3 && !stopWords.has(word))
      .slice(0, 12);
  }

  private translateCommonPhrase(value: string): string {
    const dictionary: Record<string, string> = {
      futebol: 'football soccer',
      copa: 'world cup football',
      mundial: 'world cup',
      goleiro: 'goalkeeper',
      gol: 'goal',
      estadio: 'stadium',
      jogador: 'football player',
      jogadores: 'football players',
      penalti: 'penalty kick',
      treinamento: 'training',
      torcida: 'football fans',
      trofeu: 'trophy',
      selecao: 'national team',
      campeonato: 'football tournament',
      inteligencia: 'intelligence',
      artificial: 'artificial',
      tecnologia: 'technology',
      automacao: 'automation',
      robo: 'robotics',
      dados: 'data',
      computador: 'computer',
      trabalho: 'workplace',
      emprego: 'job',
      carreira: 'career',
      profissional: 'professional',
      escritorio: 'office',
      empresa: 'business',
      equipe: 'team',
      igreja: 'church',
      culto: 'church service',
      louvor: 'worship',
      cristao: 'christian',
      crista: 'christian',
      oracao: 'prayer',
      dinheiro: 'money',
      financa: 'finance',
      investimento: 'investment',
      economia: 'economy',
      banco: 'banking',
      medico: 'doctor',
      hospital: 'hospital',
      saude: 'healthcare',
      paciente: 'patient',
      viagem: 'travel',
      cidade: 'city',
      aeroporto: 'airport',
      turista: 'tourist',
      comida: 'food',
      cozinha: 'kitchen',
      receita: 'cooking',
      restaurante: 'restaurant',
    };

    return this.normalizeComparison(value)
      .split(/\s+/)
      .map((word) => dictionary[word] ?? word)
      .join(' ');
  }

  private calculateTechnicalScore(
    video: PexelsVideo,
    targetDuration: number,
    queryPriority: number,
  ): number {
    let score = Math.max(20 - queryPriority * 4, 4);

    if (video.height > video.width) score += 24;
    else score -= 35;

    const aspectRatio = video.height > 0 ? video.width / video.height : 1;
    score += Math.max(14 - Math.abs(aspectRatio - 9 / 16) * 40, 0);

    const durationDistance = Math.abs(video.duration - targetDuration);
    if (video.duration >= targetDuration) score += 10;
    score += Math.max(10 - durationDistance, 0);

    const bestFile = this.getBestPortraitFile(video);
    if (bestFile) score += this.calculateFileQualityScore(bestFile);
    else score -= 30;

    if (video.duration < 3) score -= 18;
    if (targetDuration <= 10 && video.duration > 60) score -= 6;

    return Math.max(score, 0);
  }

  private getBestPortraitFile(video: PexelsVideo): PexelsVideoFile | undefined {
    return video.video_files
      .filter(
        (file) =>
          file.file_type === 'video/mp4' &&
          file.height > file.width &&
          file.width >= 540 &&
          file.height >= 960,
      )
      .sort(
        (first, second) =>
          this.calculateFileQualityScore(second) -
          this.calculateFileQualityScore(first),
      )[0];
  }

  private calculateFileQualityScore(file: PexelsVideoFile): number {
    let score = 0;
    if (file.width >= 540 && file.height >= 960) score += 8;
    if (file.width >= 720 && file.height >= 1280) score += 6;
    if (file.width >= 1080 && file.height >= 1920) score += 4;

    const aspectRatio = file.height > 0 ? file.width / file.height : 1;
    score += Math.max(6 - Math.abs(aspectRatio - 9 / 16) * 20, 0);
    return score;
  }

  private isAmbiguousQuery(value: string, intent: SceneIntent): boolean {
    const ambiguous = ['history', 'title', 'moment', 'event', 'story', 'people', 'life'];
    const tokens = value.split(/\s+/).filter(Boolean);
    const meaningful = tokens.filter((token) => !ambiguous.includes(token));

    if (meaningful.length < 2) return true;
    if (intent.domain.id === 'generic') return false;

    return !intent.requiredAnchors.some((anchor) =>
      value.includes(this.normalizeComparison(anchor)),
    );
  }

  private normalizeSearchQuery(value: string): string {
    return this.cleanText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 10)
      .join(' ');
  }

  private isAbstractQuery(value: string): boolean {
    const normalized = this.normalizeComparison(value);
    const abstractTerms = [
      'imagem impactante',
      'cena chamativa',
      'visual dinamico',
      'historia marcante',
      'momento inesquecivel',
      'reflexao profunda',
      'tema importante',
      'assunto relevante',
    ];
    return abstractTerms.some((expression) => normalized === expression);
  }

  private uniqueStrings(values: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
      const cleaned = this.cleanText(value);
      const normalized = this.normalizeComparison(cleaned);
      if (!cleaned || !normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(cleaned);
    }

    return result;
  }

  private normalizeComparison(value: string): string {
    return this.cleanText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private cleanText(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const mediaService = new MediaService();
