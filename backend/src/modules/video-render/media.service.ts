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
}

export interface DownloadSceneMediaInput {
  scenes: MediaSceneInput[];
  outputDirectory: string;
}

interface MediaCandidate {
  video: PexelsVideo;
  query: string;
  queryPriority: number;
  score: number;
}

export class MediaService {
  private readonly usedVideoIds =
    new Set<number>();

  async downloadMediaForScenes(
    input: DownloadSceneMediaInput,
  ): Promise<DownloadedSceneMedia[]> {
    if (
      !Array.isArray(input.scenes) ||
      input.scenes.length === 0
    ) {
      throw new Error(
        'Nenhuma cena foi informada para buscar mídias.',
      );
    }

    const outputDirectory =
      path.resolve(
        input.outputDirectory,
      );

    const orderedScenes =
      [...input.scenes].sort(
        (
          first: MediaSceneInput,
          second: MediaSceneInput,
        ): number =>
          first.order -
          second.order,
      );

    const downloaded:
      DownloadedSceneMedia[] = [];

    this.usedVideoIds.clear();

    for (
      const scene of orderedScenes
    ) {
      const queries =
        this.buildSearchQueries(
          scene,
        );

      const candidate =
        await this.findBestCandidate(
          queries,
          scene,
        );

      if (!candidate) {
        throw new Error(
          [
            `Nenhuma mídia coerente foi encontrada para a cena ${scene.order}.`,
            `Consultas tentadas: ${queries.join(' | ')}`,
          ].join('\n'),
        );
      }

      const sceneDirectory =
        path.join(
          outputDirectory,
          `scene-${String(
            scene.order,
          ).padStart(3, '0')}`,
        );

      const filePath =
        await pexelsProvider.download(
          candidate.video,
          sceneDirectory,
        );

      this.usedVideoIds.add(
        candidate.video.id,
      );

      downloaded.push({
        order:
          scene.order,

        query:
          candidate.query,

        filePath,

        durationSec:
          Math.max(
            scene.durationSec,
            1,
          ),

        source:
          'PEXELS',

        sourceVideoId:
          candidate.video.id,

        sourcePageUrl:
          candidate.video.url,
      });
    }

    return downloaded;
  }

  async searchAndDownloadSingleVideo(
    keywords: string[],
    outputDirectory: string,
  ): Promise<string> {
    const cleanedKeywords =
      keywords
        .map(
          (
            keyword: string,
          ): string =>
            this.cleanText(
              keyword,
            ),
        )
        .filter(
          (
            keyword: string,
          ): boolean =>
            keyword.length > 0,
        );

    if (
      cleanedKeywords.length ===
      0
    ) {
      throw new Error(
        'Nenhuma palavra-chave válida foi informada para buscar mídia.',
      );
    }

    const query =
      cleanedKeywords
        .slice(0, 5)
        .join(' ');

    const videos =
      await pexelsProvider.search(
        query,
        20,
      );

    const selected =
      videos
        .map(
          (
            video: PexelsVideo,
          ) => ({
            video,

            score:
              this.calculateVideoScore(
                video,
                8,
                0,
              ),
          }),
        )
        .sort(
          (
            first,
            second,
          ): number =>
            second.score -
            first.score,
        )[0]?.video;

    if (!selected) {
      throw new Error(
        `Nenhum vídeo encontrado no Pexels para "${query}".`,
      );
    }

    return pexelsProvider.download(
      selected,
      outputDirectory,
    );
  }

  private async findBestCandidate(
    queries: string[],
    scene: MediaSceneInput,
  ): Promise<MediaCandidate | undefined> {
    const candidates:
      MediaCandidate[] = [];

    /*
     * Limita as consultas para não aumentar
     * demais o número de chamadas ao Pexels.
     */
    const limitedQueries =
      queries.slice(0, 5);

    for (
      let queryIndex = 0;
      queryIndex <
      limitedQueries.length;
      queryIndex += 1
    ) {
      const query =
        limitedQueries[
          queryIndex
        ];

      if (!query) {
        continue;
      }

      try {
        const videos =
          await pexelsProvider.search(
            query,
            20,
          );

        for (
          const video of videos
        ) {
          if (
            this.usedVideoIds.has(
              video.id,
            )
          ) {
            continue;
          }

          const score =
            this.calculateVideoScore(
              video,
              scene.durationSec,
              queryIndex,
            );

          candidates.push({
            video,
            query,
            queryPriority:
              queryIndex,
            score,
          });
        }

        /*
         * Se a consulta mais específica já devolveu
         * bons candidatos, não precisamos executar
         * todas as consultas genéricas.
         */
        const strongCandidate =
          candidates.some(
            (
              candidate:
                MediaCandidate,
            ): boolean =>
              candidate.queryPriority ===
                queryIndex &&
              candidate.score >= 72,
          );

        if (
          strongCandidate &&
          queryIndex <= 1
        ) {
          break;
        }
      } catch (error: unknown) {
        console.warn(
          `⚠️ Falha na busca de mídia para "${query}".`,
          error instanceof Error
            ? error.message
            : error,
        );
      }
    }

    return candidates
      .sort(
        (
          first:
            MediaCandidate,
          second:
            MediaCandidate,
        ): number =>
          second.score -
          first.score,
      )[0];
  }

  private buildSearchQueries(
    scene: MediaSceneInput,
  ): string[] {
    const explicitKeywords =
      Array.isArray(
        scene.searchKeywords,
      )
        ? scene.searchKeywords
            .map(
              (
                keyword: string,
              ): string =>
                this.cleanText(
                  keyword,
                ),
            )
            .filter(
              (
                keyword: string,
              ): boolean =>
                keyword.length > 0,
            )
        : [];

    const visual =
      this.cleanText(
        scene.visual,
      );

    const voiceover =
      this.cleanText(
        scene.voiceover,
      );

    const name =
      this.cleanText(
        scene.name,
      );

    const sourceText =
      [
        ...explicitKeywords,
        visual,
        voiceover,
        name,
      ]
        .filter(Boolean)
        .join(' ');

    const domain =
      this.detectDomain(
        sourceText,
      );

    const concreteTerms =
      this.extractConcreteTerms(
        sourceText,
      );

    const translatedTerms =
      this.translateCommonTerms(
        concreteTerms,
      );

    const queries:
      string[] = [];

    /*
     * Palavras-chave explícitas da IA têm prioridade.
     */
    for (
      const keyword of
      explicitKeywords
    ) {
      const normalized =
        this.normalizeSearchQuery(
          this.translateCommonPhrase(
            keyword,
          ),
        );

      if (normalized) {
        queries.push(
          normalized,
        );
      }
    }

    /*
     * Consulta principal por domínio.
     */
    if (
      domain &&
      translatedTerms.length >
        0
    ) {
      queries.push(
        this.normalizeSearchQuery(
          [
            domain.primary,
            ...translatedTerms.slice(
              0,
              3,
            ),
          ].join(' '),
        ),
      );
    }

    /*
     * Consultas específicas definidas pelo domínio.
     */
    if (domain) {
      for (
        const fallbackQuery of
        domain.queries
      ) {
        queries.push(
          this.normalizeSearchQuery(
            fallbackQuery,
          ),
        );
      }
    }

    /*
     * Consulta baseada em termos concretos.
     */
    if (
      translatedTerms.length >
      0
    ) {
      queries.push(
        this.normalizeSearchQuery(
          translatedTerms
            .slice(0, 5)
            .join(' '),
        ),
      );
    }

    /*
     * Último fallback: nome da cena com o domínio.
     */
    if (name) {
      queries.push(
        this.normalizeSearchQuery(
          this.translateCommonPhrase(
            `${domain?.primary ?? ''} ${name}`,
          ),
        ),
      );
    }

    const uniqueQueries =
      this.uniqueStrings(
        queries,
      ).filter(
        (
          query: string,
        ): boolean =>
          query.length >= 3 &&
          !this.isAbstractQuery(
            query,
          ),
      );

    if (
      uniqueQueries.length ===
      0
    ) {
      throw new Error(
        `A cena ${scene.order} não possui informações visuais concretas suficientes para buscar mídia.`,
      );
    }

    return uniqueQueries;
  }

  private detectDomain(
    value: string,
  ):
    | {
        primary: string;
        queries: string[];
      }
    | undefined {
    const normalized =
      this.normalizeComparison(
        value,
      );

    const domains = [
      {
        matches: [
          'futebol',
          'goleiro',
          'gol',
          'estadio',
          'jogador',
          'penalti',
          'time',
          'campeonato',
          'soccer',
          'football',
          'goalkeeper',
        ],

        primary:
          'football soccer',

        queries: [
          'soccer goalkeeper stadium',
          'football goalkeeper training',
          'soccer goal save',
          'football player stadium',
        ],
      },

      {
        matches: [
          'inteligencia artificial',
          'ia',
          'automacao',
          'tecnologia',
          'algoritmo',
          'robot',
          'artificial intelligence',
        ],

        primary:
          'artificial intelligence technology',

        queries: [
          'professional using artificial intelligence computer',
          'artificial intelligence office technology',
          'data analysis computer office',
          'robotics automation workplace',
        ],
      },

      {
        matches: [
          'trabalho',
          'emprego',
          'carreira',
          'profissao',
          'empresa',
          'escritorio',
          'workplace',
          'job',
          'career',
        ],

        primary:
          'professional workplace',

        queries: [
          'professional working computer office',
          'business team office technology',
          'employee working laptop',
          'modern workplace automation',
        ],
      },

      {
        matches: [
          'igreja',
          'cristao',
          'crista',
          'louvor',
          'culto',
          'fe',
          'worship',
          'church',
        ],

        primary:
          'church worship',

        queries: [
          'church worship service',
          'people worshiping church',
          'church musician worship',
          'person praying church',
        ],
      },

      {
        matches: [
          'dinheiro',
          'financa',
          'investimento',
          'economia',
          'banco',
          'money',
          'finance',
        ],

        primary:
          'finance money',

        queries: [
          'financial analyst computer',
          'business finance charts',
          'person managing money',
          'investment data analysis',
        ],
      },

      {
        matches: [
          'saude',
          'medico',
          'hospital',
          'doenca',
          'tratamento',
          'health',
          'doctor',
        ],

        primary:
          'healthcare medical',

        queries: [
          'doctor hospital patient',
          'medical professional healthcare',
          'doctor analyzing results',
          'hospital technology',
        ],
      },

      {
        matches: [
          'viagem',
          'turismo',
          'pais',
          'cidade',
          'aeroporto',
          'travel',
        ],

        primary:
          'travel tourism',

        queries: [
          'traveler city destination',
          'tourist exploring city',
          'airport traveler',
          'travel landscape',
        ],
      },

      {
        matches: [
          'comida',
          'receita',
          'cozinha',
          'restaurante',
          'food',
          'cooking',
        ],

        primary:
          'food cooking',

        queries: [
          'chef cooking kitchen',
          'food preparation restaurant',
          'person cooking meal',
          'restaurant kitchen',
        ],
      },
    ];

    let bestDomain:
      | {
          primary: string;
          queries: string[];
          matches: string[];
        }
      | undefined;

    let bestScore = 0;

    for (
      const domain of domains
    ) {
      const score =
        domain.matches.reduce(
          (
            total: number,
            term: string,
          ): number =>
            normalized.includes(
              this.normalizeComparison(
                term,
              ),
            )
              ? total + 1
              : total,
          0,
        );

      if (score > bestScore) {
        bestScore = score;
        bestDomain =
          domain;
      }
    }

    if (
      !bestDomain ||
      bestScore === 0
    ) {
      return undefined;
    }

    return {
      primary:
        bestDomain.primary,

      queries:
        bestDomain.queries,
    };
  }

  private extractConcreteTerms(
    value: string,
  ): string[] {
    const stopWords =
      new Set<string>([
        'a',
        'o',
        'as',
        'os',
        'um',
        'uma',
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
        'como',
        'porque',
        'quando',
        'onde',
        'isso',
        'isto',
        'esse',
        'essa',
        'este',
        'esta',
        'mais',
        'menos',
        'muito',
        'muita',
        'pouco',
        'pode',
        'podem',
        'deve',
        'devem',
        'foi',
        'era',
        'ser',
        'esta',
        'estao',
        'tem',
        'ter',
        'faz',
        'fazer',
        'mostra',
        'mostrar',
        'pessoa',
        'cena',
        'imagem',
        'video',
        'vertical',
        'plano',
        'enquadramento',
        'iluminacao',
        'natural',
        'moderno',
        'moderna',
        'relacionado',
        'relacionada',
        'assunto',
        'tema',
        'contexto',
        'detalhe',
        'historia',
        'impactante',
        'reflexao',
        'informacao',
        'analise',
        'conclusao',
      ]);

    return this.normalizeComparison(
      value,
    )
      .split(/\s+/)
      .filter(
        (
          word: string,
        ): boolean =>
          word.length >= 3 &&
          !stopWords.has(
            word,
          ),
      )
      .slice(0, 10);
  }

  private translateCommonTerms(
    terms: string[],
  ): string[] {
    return terms.map(
      (
        term: string,
      ): string =>
        this.translateCommonPhrase(
          term,
        ),
    );
  }

  private translateCommonPhrase(
    value: string,
  ): string {
    const dictionary:
      Record<string, string> = {
        futebol:
          'football soccer',
        goleiro:
          'goalkeeper',
        gol:
          'goal',
        estadio:
          'stadium',
        jogador:
          'football player',
        penalti:
          'penalty kick',
        treinamento:
          'training',

        inteligencia:
          'intelligence',
        artificial:
          'artificial',
        tecnologia:
          'technology',
        automacao:
          'automation',
        robo:
          'robotics',
        dados:
          'data',
        computador:
          'computer',

        trabalho:
          'workplace',
        emprego:
          'job',
        carreira:
          'career',
        profissional:
          'professional',
        escritorio:
          'office',
        empresa:
          'business',
        equipe:
          'team',

        igreja:
          'church',
        culto:
          'church service',
        louvor:
          'worship',
        cristao:
          'christian',
        crista:
          'christian',
        oracao:
          'prayer',

        dinheiro:
          'money',
        financa:
          'finance',
        investimento:
          'investment',
        economia:
          'economy',
        banco:
          'banking',

        medico:
          'doctor',
        hospital:
          'hospital',
        saude:
          'healthcare',
        paciente:
          'patient',

        viagem:
          'travel',
        cidade:
          'city',
        aeroporto:
          'airport',
        turista:
          'tourist',

        comida:
          'food',
        cozinha:
          'kitchen',
        receita:
          'cooking',
        restaurante:
          'restaurant',
      };

    const normalized =
      this.normalizeComparison(
        value,
      );

    return normalized
      .split(/\s+/)
      .map(
        (
          word: string,
        ): string =>
          dictionary[word] ??
          word,
      )
      .join(' ');
  }

  private calculateVideoScore(
    video: PexelsVideo,
    targetDuration: number,
    queryPriority: number,
  ): number {
    let score = 0;

    /*
     * Consultas mais específicas recebem bônus.
     */
    score += Math.max(
      24 -
        queryPriority * 5,
      4,
    );

    /*
     * Formato vertical.
     */
    if (
      video.height >
      video.width
    ) {
      score += 25;
    } else {
      score -= 30;
    }

    const aspectRatio =
      video.height > 0
        ? video.width /
          video.height
        : 1;

    const targetRatio =
      9 / 16;

    const ratioDistance =
      Math.abs(
        aspectRatio -
          targetRatio,
      );

    score += Math.max(
      15 -
        ratioDistance * 40,
      0,
    );

    /*
     * Duração próxima da cena.
     */
    const durationDistance =
      Math.abs(
        video.duration -
          targetDuration,
      );

    if (
      video.duration >=
      targetDuration
    ) {
      score += 12;
    }

    score += Math.max(
      12 -
        durationDistance,
      0,
    );

    /*
     * Qualidade dos arquivos disponíveis.
     */
    const bestFile =
      this.getBestPortraitFile(
        video,
      );

    if (bestFile) {
      score +=
        this.calculateFileQualityScore(
          bestFile,
        );
    } else {
      score -= 20;
    }

    /*
     * Evita clipes excessivamente curtos.
     */
    if (
      video.duration < 3
    ) {
      score -= 15;
    }

    /*
     * Evita vídeos muito longos para cenas curtas.
     */
    if (
      targetDuration <= 10 &&
      video.duration > 60
    ) {
      score -= 5;
    }

    return Math.max(
      score,
      0,
    );
  }

  private getBestPortraitFile(
    video: PexelsVideo,
  ): PexelsVideoFile | undefined {
    return video.video_files
      .filter(
        (
          file: PexelsVideoFile,
        ): boolean =>
          file.file_type ===
            'video/mp4' &&
          file.height >
            file.width,
      )
      .sort(
        (
          first:
            PexelsVideoFile,
          second:
            PexelsVideoFile,
        ): number =>
          this.calculateFileQualityScore(
            second,
          ) -
          this.calculateFileQualityScore(
            first,
          ),
      )[0];
  }

  private calculateFileQualityScore(
    file: PexelsVideoFile,
  ): number {
    let score = 0;

    if (
      file.width >= 540 &&
      file.height >= 960
    ) {
      score += 8;
    }

    if (
      file.width >= 720 &&
      file.height >= 1280
    ) {
      score += 6;
    }

    if (
      file.width >= 1080 &&
      file.height >= 1920
    ) {
      score += 4;
    }

    const aspectRatio =
      file.height > 0
        ? file.width /
          file.height
        : 1;

    const targetRatio =
      9 / 16;

    score += Math.max(
      6 -
        Math.abs(
          aspectRatio -
            targetRatio,
        ) *
          20,
      0,
    );

    return score;
  }

  private normalizeSearchQuery(
    value: string,
  ): string {
    return this.cleanText(
      value,
    )
      .replace(
        /[^a-zA-Z0-9\s-]/g,
        ' ',
      )
      .replace(
        /\s+/g,
        ' ',
      )
      .trim()
      .split(/\s+/)
      .slice(0, 8)
      .join(' ');
  }

  private isAbstractQuery(
    value: string,
  ): boolean {
    const normalized =
      this.normalizeComparison(
        value,
      );

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

    return abstractTerms.some(
      (
        expression: string,
      ): boolean =>
        normalized ===
        expression,
    );
  }

  private uniqueStrings(
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
        this.cleanText(
          value,
        );

      const normalized =
        this.normalizeComparison(
          cleaned,
        );

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

  private normalizeComparison(
    value: string,
  ): string {
    return this.cleanText(
      value,
    )
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

  private cleanText(
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
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,
        '',
      )
      .replace(
        /\s+/g,
        ' ',
      )
      .trim();
  }
}

export const mediaService =
  new MediaService();
