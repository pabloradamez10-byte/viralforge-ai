/**
 * Score de "viralidade" 0..100.
 * Combina: views, likes/views ratio, recência, completude dos metadados.
 */
export function computeViralScore(v: {
  views: number;
  likes?: number;
  comments?: number;
  publishedAt: Date;
  tags?: string[];
  description?: string;
}): number {
  let score = 0;

  // views (log10)
  if (v.views > 0) {
    const s = Math.log10(v.views + 1) * 8; // log10(100M+1)*8 ≈ 64
    score += Math.min(s, 50);
  }

  // engagement
  const likes = v.likes ?? 0;
  if (v.views > 0 && likes > 0) {
    const ratio = likes / v.views;
    score += Math.min(ratio * 1000, 25); // até 25 pts
  }
  if (v.comments && v.comments > 0) {
    score += Math.min(Math.log10(v.comments + 1) * 4, 15);
  }

  // recência
  const ageDays = Math.max(0, (Date.now() - v.publishedAt.getTime()) / 86400000);
  if (ageDays <= 1) score += 10;
  else if (ageDays <= 7) score += 7;
  else if (ageDays <= 30) score += 4;
  else if (ageDays <= 90) score += 1;

  // completude
  if (v.tags && v.tags.length >= 3) score += 3;
  if (v.description && v.description.length > 50) score += 2;

  return Math.round(Math.max(0, Math.min(100, score)));
}
