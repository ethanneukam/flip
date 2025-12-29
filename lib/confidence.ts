// lib/confidence.ts

/**
 * Calculates a Confidence Score (1-100) based on scrape density
 * and price spread across sources.
 */
export function calculateConfidence(sources: { price: number; site: string }[]) {
  if (sources.length === 0) return 0;
  
  // 1. Density Score: More sources = more trust (up to 5 sources)
  const density = Math.min(sources.length * 20, 60);

  // 2. Variance Score: High spread between eBay and StockX = less trust
  const prices = sources.map(s => s.price);
  const avg = prices.reduce((a, b) => a + b) / prices.length;
  const diffs = prices.map(p => Math.abs(p - avg));
  const maxDiff = Math.max(...diffs);
  
  // If price spread is > 15% of average, confidence drops
  const variancePenalty = maxDiff > avg * 0.15 ? 20 : 0;

  return Math.max(density + (40 - variancePenalty), 10);
}
