/**
 * Interface comum a todas as fontes de tendências.
 * Cada scraper retorna itens normalizados.
 */

export interface RawTrendItem {
  externalId?: string;
  title: string;
  url?: string;
  publishedAt?: Date;
  payload: Record<string, unknown>;
  language?: string;
  region?: string;
  estimatedVolume?: number;
}

export interface TrendSource {
  readonly slug: string;
  fetch(query: string, options?: { region?: string; language?: string; limit?: number }): Promise<RawTrendItem[]>;
}
