import type { GlasscardConfidenceTier } from '../../types/models';

export function formatUSD(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)}%`;
}

export function confidenceTierLabel(tier: GlasscardConfidenceTier | null): string {
  if (!tier) return 'Analyzing...';
  const map: Record<GlasscardConfidenceTier, string> = {
    sufficient_history: 'High Confidence',
    category_baseline: 'Category Match',
    ai_estimate_only: 'AI Estimated',
  };
  return map[tier];
}

export function confidenceTierColor(tier: GlasscardConfidenceTier | null): string {
  if (!tier) return '#4B5563';
  const map: Record<GlasscardConfidenceTier, string> = {
    sufficient_history: '#10B981',
    category_baseline: '#F59E0B',
    ai_estimate_only: '#F97316',
  };
  return map[tier];
}

export function demandLabel(score: number | null): string {
  if (score === null) return '—';
  if (score > 70) return 'High Demand';
  if (score >= 30) return 'Moderate Demand';
  return 'Low Demand';
}

export function liquidityLabel(score: number | null): string {
  if (score === null) return '—';
  if (score > 70) return 'Highly Liquid';
  if (score >= 30) return 'Active Market';
  return 'Illiquid';
}

export function volatilityLabel(score: number | null): string {
  if (score === null) return '—';
  if (score > 70) return 'High Volatility';
  if (score >= 30) return 'Moderate Swings';
  return 'Stable Price';
}

export function sellerTrustTier(repScore: number): string {
  if (repScore >= 2000) return 'Market Maker';
  if (repScore >= 500) return 'Power Seller';
  if (repScore >= 100) return 'Active Seller';
  return 'New Trader';
}

export function predictionAccuracy(total: number, correct: number): string {
  if (total === 0) return 'New Seller';
  return `${Math.round((correct / total) * 100)}%`;
}

export function predictionAccuracyColor(total: number, correct: number): string {
  if (total === 0) return '#9CA3AF';
  const pct = (correct / total) * 100;
  if (pct > 75) return '#10B981';
  if (pct >= 50) return '#F59E0B';
  return '#EF4444';
}

export function sellerInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

export const SOURCE_COLORS: Record<string, string> = {
  eBay: '#E53238',
  StockX: '#10B981',
  Amazon: '#F97316',
  Walmart: '#0071CE',
  Target: '#CC0000',
};

export function sourceColor(source: string): string {
  return SOURCE_COLORS[source] ?? '#6B7280';
}
