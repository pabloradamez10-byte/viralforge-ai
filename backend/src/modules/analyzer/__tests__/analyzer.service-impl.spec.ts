import { analyzeRecord } from '../analyzer.service-impl.js';

describe('analyzeRecord', () => {
  it('extrai volume de traffic numérico', () => {
    const r = analyzeRecord({ title: 'AI', payload: { traffic: 50000 } });
    expect(r.volume).toBe(50000);
    expect(r.popularity).toBeGreaterThan(0);
  });

  it('parseia tráfego tipo "10K+" e "1.2M"', () => {
    const r1 = analyzeRecord({ title: 'X', payload: { traffic: '10K+' } });
    const r2 = analyzeRecord({ title: 'X', payload: { traffic: '1.2M' } });
    expect(r1.volume).toBe(10000);
    expect(r2.volume).toBe(1_200_000);
  });

  it('calcula growth positivo com histórico menor', () => {
    const now = new Date();
    const r = analyzeRecord({
      title: 'X',
      payload: { traffic: 1000 },
      history: [
        { snapshotDate: new Date(now.getTime() - 6 * 86400000), volume: 100 },
        { snapshotDate: new Date(now.getTime() - 5 * 86400000), volume: 100 },
        { snapshotDate: new Date(now.getTime() - 4 * 86400000), volume: 100 },
        { snapshotDate: new Date(now.getTime() - 3 * 86400000), volume: 100 },
        { snapshotDate: new Date(now.getTime() - 2 * 86400000), volume: 100 },
        { snapshotDate: new Date(now.getTime() - 1 * 86400000), volume: 100 },
        { snapshotDate: now, volume: 100 },
      ],
    });
    expect(r.growthPct).toBeGreaterThan(0);
  });

  it('opportunityScore é 0..1', () => {
    const r = analyzeRecord({ title: 'X', payload: { traffic: 1000 } });
    expect(r.opportunityScore).toBeGreaterThanOrEqual(0);
    expect(r.opportunityScore).toBeLessThanOrEqual(1);
  });

  it('competitionScore sobe com mais articles e comments', () => {
    const low = analyzeRecord({ title: 'X', payload: { traffic: 100 } });
    const high = analyzeRecord({
      title: 'X',
      payload: { traffic: 100, articles: Array(20).fill({}), num_comments: 5000 },
    });
    expect(high.competitionScore).toBeGreaterThan(low.competitionScore);
  });

  it('lifetimeDays é 0 quando sem publishedAt', () => {
    const r = analyzeRecord({ title: 'X', payload: {} });
    expect(r.lifetimeDays).toBe(0);
  });

  it('lifetimeDays é positivo com publishedAt no passado', () => {
    const r = analyzeRecord({
      title: 'X',
      payload: {},
      publishedAt: new Date(Date.now() - 5 * 86400000),
    });
    expect(r.lifetimeDays).toBe(5);
  });

  it('timeSeries retorna 30 pontos', () => {
    const r = analyzeRecord({ title: 'X', payload: { traffic: 1000 } });
    expect(r.timeSeries).toHaveLength(30);
    for (const p of r.timeSeries) {
      expect(typeof p.date).toBe('string');
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof p.value).toBe('number');
    }
  });

  it('seasonalityScore respeita lifetimeDays', () => {
    const fresh = analyzeRecord({
      title: 'X',
      payload: {},
      publishedAt: new Date(),
    });
    const old = analyzeRecord({
      title: 'X',
      payload: {},
      publishedAt: new Date(Date.now() - 120 * 86400000),
    });
    expect(old.seasonalityScore).toBeGreaterThan(fresh.seasonalityScore);
  });
});
