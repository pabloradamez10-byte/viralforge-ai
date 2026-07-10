export interface Source {
  id: string;
  slug: string;
  name: string;
  type: string;
  baseUrl: string | null;
  active: boolean;
  config: any;
}

export interface TrendMetric {
  id: string;
  volume: number;
  growthPct: number;
  declinePct: number;
  competitionScore: number;
  opportunityScore: number;
  seasonalityScore: number;
  lifetimeDays: number;
  popularity: number;
  timeSeries: Array<{ date: string; value: number }>;
  snapshotDate: string;
}

export interface TrendRecord {
  id: string;
  title: string;
  url: string | null;
  collectedAt: string;
  publishedAt: string | null;
  source: Pick<Source, 'id' | 'slug' | 'name' | 'type'>;
  metrics: TrendMetric[];
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
