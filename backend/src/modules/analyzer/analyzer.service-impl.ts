/**
 * Implementação pura de analyzeRecord. Sem imports do Prisma.
 * Exporta também utilitários para testes.
 */

export interface AnalyzeInput {
  title: string;
  payload: Record<string, unknown>;
  publishedAt?: Date;
  history?: Array<{ snapshotDate: Date; volume: number }>;
}

export interface AnalyzeOutput {
  volume: number;
  growthPct: number;
  declinePct: number;
  competitionScore: number;
  opportunityScore: number;
  seasonalityScore: number;
  lifetimeDays: number;
  popularity: number;
  timeSeries: Array<{ date: string; value: number }>;
}

export function analyzeRecord(input: AnalyzeInput): AnalyzeOutput {
  const volume = extractVolume(input.payload);
  const popularity = extractPopularity(input.payload, volume);
  const competitionScore = extractCompetition(input.payload);
  const lifetimeDays = extractLifetime(input.publishedAt);
  const growthPct = computeGrowth(volume, input.history);
  const declinePct = computeDecline(volume, input.history);
  const seasonalityScore = extractSeasonality(input.payload, lifetimeDays);
  const opportunityScore = computeOpportunity({
    volume,
    growthPct,
    declinePct,
    competitionScore,
    lifetimeDays,
  });
  const timeSeries = buildTimeSeries(volume, growthPct, declinePct, input.history);

  return {
    volume,
    growthPct,
    declinePct,
    competitionScore: round(competitionScore, 3),
    opportunityScore: round(opportunityScore, 3),
    seasonalityScore: round(seasonalityScore, 3),
    lifetimeDays,
    popularity: clamp(popularity, 0, 100),
    timeSeries,
  };
}

function extractVolume(payload: Record<string, unknown>): number {
  const candidates = [
    payload.traffic,
    payload.video_views,
    payload.views,
    payload.score,
    payload.volume,
    payload.estimatedVolume,
  ];
  for (const c of candidates) {
    const n = toNumber(c);
    if (n && n > 0) return n;
  }
  return 0;
}

function extractPopularity(payload: Record<string, unknown>, volume: number): number {
  if (volume <= 0) return 0;
  return Math.log10(volume + 1) * 10;
}

function extractCompetition(payload: Record<string, unknown>): number {
  let score = 0;
  const articles = (payload as any).articles;
  if (Array.isArray(articles)) score += Math.min(articles.length / 10, 0.5);
  const numComments = toNumber((payload as any).num_comments);
  if (numComments > 0) score += Math.min(numComments / 1000, 0.3);
  const descendants = toNumber((payload as any).descendants);
  if (descendants > 0) score += Math.min(descendants / 500, 0.2);
  return clamp(score, 0, 1);
}

function extractLifetime(publishedAt?: Date): number {
  if (!publishedAt) return 0;
  const diffMs = Date.now() - publishedAt.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

function extractSeasonality(_payload: Record<string, unknown>, lifetimeDays: number): number {
  if (lifetimeDays <= 0) return 0.1;
  if (lifetimeDays < 3) return 0.2;
  if (lifetimeDays < 14) return 0.4;
  if (lifetimeDays < 60) return 0.6;
  return 0.8;
}

function computeGrowth(volume: number, history?: AnalyzeInput['history']): number {
  if (!history?.length || volume <= 0) return 0;
  const sorted = [...history].sort((a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime());
  const baselineWindow = sorted.slice(-7);
  if (!baselineWindow.length) return 0;
  const avg = baselineWindow.reduce((s, h) => s + h.volume, 0) / baselineWindow.length;
  if (avg <= 0) return 0;
  const pct = ((volume - avg) / avg) * 100;
  return clamp(Math.round(pct), -100, 1000);
}

function computeDecline(volume: number, history?: AnalyzeInput['history']): number {
  const g = computeGrowth(volume, history);
  return g < 0 ? Math.abs(g) : 0;
}

function computeOpportunity(input: {
  volume: number;
  growthPct: number;
  declinePct: number;
  competitionScore: number;
  lifetimeDays: number;
}): number {
  const growth = clamp(input.growthPct / 100, -1, 1);
  const decline = clamp(-input.declinePct / 100, -1, 1);
  const competition = 1 - input.competitionScore;
  const freshness = input.lifetimeDays <= 7 ? 1 : input.lifetimeDays <= 30 ? 0.6 : 0.3;
  const volumeFactor = input.volume > 0 ? Math.min(Math.log10(input.volume + 1) / 6, 1) : 0;
  const score = growth * 0.35 + decline * 0.1 + competition * 0.25 + freshness * 0.2 + volumeFactor * 0.1;
  return clamp(score, 0, 1);
}

function buildTimeSeries(
  volume: number,
  growthPct: number,
  declinePct: number,
  history?: AnalyzeInput['history'],
): Array<{ date: string; value: number }> {
  const days = 30;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const out: Array<{ date: string; value: number }> = [];

  if (history?.length) {
    const sorted = [...history].sort((a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime());
    for (const h of sorted) {
      out.push({ date: h.snapshotDate.toISOString().slice(0, 10), value: h.volume });
    }
  }

  const trendPerDay = growthPct > 0 ? growthPct / 100 : declinePct > 0 ? -declinePct / 100 : 0;
  const step = trendPerDay / days;
  let cur = volume > 0 ? volume / (1 + trendPerDay) : 0;
  for (let i = out.length; i < days; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - (days - 1 - i));
    cur = cur * (1 + step);
    out.push({ date: d.toISOString().slice(0, 10), value: Math.max(0, Math.round(cur)) });
  }
  return out;
}

function toNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const trimmed = v.trim();
    // Suporta sufixos: K (mil), M (milhão), B (bilhão)
    const m = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*([KkMmBb])?/);
    if (!m) return 0;
    const base = Number(m[1]);
    if (!Number.isFinite(base)) return 0;
    const suf = m[2]?.toUpperCase();
    const mult = suf === 'K' ? 1_000 : suf === 'M' ? 1_000_000 : suf === 'B' ? 1_000_000_000 : 1;
    return base * mult;
  }
  return 0;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
