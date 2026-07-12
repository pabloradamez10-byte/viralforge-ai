import { z } from 'zod';

/**
 * DTOs do módulo Viral Videos.
 *
 * Os vídeos encontrados são usados apenas como referência editorial
 * e analítica. O módulo trabalha com metadados públicos.
 */

export const ViralPlatformSchema = z.enum([
  'YOUTUBE',
  'TIKTOK',
  'REDDIT',
  'ALL',
]);

export const ViralTimeWindowSchema = z.enum([
  '1h',
  '6h',
  '24h',
  '7d',
  '30d',
]);

export const ViralVideoDurationSchema = z.enum([
  'ANY',
  'SHORT',
  'MEDIUM',
  'LONG',
]);

export const ViralOrderSchema = z.enum([
  'VIRAL_SCORE',
  'VIEW_VELOCITY',
  'ENGAGEMENT',
  'RECENT',
  'VIEWS',
]);

export const ListViralVideosDto = z.object({
  /**
   * Tema, nicho, palavra-chave ou assunto.
   * Na listagem pode ficar vazio para retornar resultados gerais.
   */
  niche: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional(),

  platform: ViralPlatformSchema.default(
    'ALL',
  ),

  /**
   * Código de região usado pelas fontes compatíveis.
   * Exemplo: BR, US, PT.
   */
  region: z
    .string()
    .trim()
    .min(2)
    .max(8)
    .default('BR')
    .transform((value) =>
      value.toUpperCase(),
    ),

  /**
   * Idioma principal da busca.
   * Exemplo: pt, pt-BR, en.
   */
  language: z
    .string()
    .trim()
    .min(2)
    .max(12)
    .default('pt'),

  /**
   * Janela usada para filtrar a data de publicação.
   */
  timeWindow:
    ViralTimeWindowSchema.default('24h'),

  /**
   * Filtro aproximado de duração.
   *
   * SHORT: vídeos curtos
   * MEDIUM: vídeos médios
   * LONG: vídeos longos
   */
  duration:
    ViralVideoDurationSchema.default(
      'ANY',
    ),

  /**
   * Forma de ordenação dos resultados já enriquecidos.
   */
  order:
    ViralOrderSchema.default(
      'VIRAL_SCORE',
    ),

  /**
   * Score mínimo aceito depois da análise.
   */
  minScore: z.coerce
    .number()
    .min(0)
    .max(100)
    .default(45),

  /**
   * Permite incluir comentários públicos na análise.
   * Será usado somente quando a plataforma oferecer suporte.
   */
  includeComments: z.coerce
    .boolean()
    .default(false),

  /**
   * Permite buscar dados públicos do canal.
   */
  includeChannelStats: z.coerce
    .boolean()
    .default(true),

  /**
   * Permite extrair hashtags de títulos e descrições.
   */
  includeHashtags: z.coerce
    .boolean()
    .default(true),

  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20),
});

export type ListViralVideosDto =
  z.infer<
    typeof ListViralVideosDto
  >;

export const SearchViralVideosDto =
  z.object({
    /**
     * Busca explícita iniciada pelo usuário.
     */
    niche: z
      .string()
      .trim()
      .min(2)
      .max(120),

    platform:
      ViralPlatformSchema.default(
        'YOUTUBE',
      ),

    region: z
      .string()
      .trim()
      .min(2)
      .max(8)
      .default('BR')
      .transform((value) =>
        value.toUpperCase(),
      ),

    language: z
      .string()
      .trim()
      .min(2)
      .max(12)
      .default('pt'),

    timeWindow:
      ViralTimeWindowSchema.default(
        '24h',
      ),

    duration:
      ViralVideoDurationSchema.default(
        'ANY',
      ),

    order:
      ViralOrderSchema.default(
        'VIRAL_SCORE',
      ),

    minScore: z.coerce
      .number()
      .min(0)
      .max(100)
      .default(0),

    includeComments: z.coerce
      .boolean()
      .default(false),

    includeChannelStats: z.coerce
      .boolean()
      .default(true),

    includeHashtags: z.coerce
      .boolean()
      .default(true),

    /**
     * Quantidade final desejada.
     * O serviço poderá buscar mais itens internamente para depois
     * filtrar e ordenar.
     */
    maxResults: z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .default(25),
  });

export type SearchViralVideosDto =
  z.infer<
    typeof SearchViralVideosDto
  >;

export type ViralPlatform =
  z.infer<
    typeof ViralPlatformSchema
  >;

export type ViralTimeWindow =
  z.infer<
    typeof ViralTimeWindowSchema
  >;

export type ViralVideoDuration =
  z.infer<
    typeof ViralVideoDurationSchema
  >;

export type ViralOrder =
  z.infer<
    typeof ViralOrderSchema
  >;

/**
 * Converte a janela escolhida em milissegundos.
 */
export function viralTimeWindowToMs(
  timeWindow: ViralTimeWindow,
): number {
  switch (timeWindow) {
    case '1h':
      return 60 * 60 * 1000;

    case '6h':
      return 6 * 60 * 60 * 1000;

    case '24h':
      return 24 * 60 * 60 * 1000;

    case '7d':
      return 7 * 24 * 60 * 60 * 1000;

    case '30d':
      return 30 * 24 * 60 * 60 * 1000;

    default:
      return 24 * 60 * 60 * 1000;
  }
}

/**
 * Retorna a data inicial correspondente à janela escolhida.
 */
export function viralPublishedAfter(
  timeWindow: ViralTimeWindow,
): Date {
  return new Date(
    Date.now() -
      viralTimeWindowToMs(
        timeWindow,
      ),
  );
}
