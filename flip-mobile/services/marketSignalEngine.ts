import { MarketSignal, ItemCondition, TrendDirection, Recommendation } from '../types/models';

const CONDITION_MULTIPLIERS: Record<ItemCondition, number> = {
  mint: 1.10,
  excellent: 1.00,
  good: 0.85,
  fair: 0.65,
  poor: 0.45,
};

export function applyConditionMultiplier(avgPrice: number, condition: ItemCondition): number {
  return Math.round(avgPrice * CONDITION_MULTIPLIERS[condition] * 100) / 100;
}

export function computeLiquidityScore(demandScore: number, supplyScore: number): number {
  return Math.round((demandScore * 0.6) + ((100 - supplyScore) * 0.4));
}

export function computeTrendScore(trendDirection: TrendDirection): number {
  if (trendDirection === 'up') return 80;
  if (trendDirection === 'down') return 20;
  return 50;
}

export function computeFlipScore(
  demandScore: number,
  liquidityScore: number,
  trendDirection: TrendDirection
): number {
  const trendScore = computeTrendScore(trendDirection);
  return Math.round(
    (demandScore * 0.4) + (liquidityScore * 0.3) + (trendScore * 0.3)
  );
}

export function deriveRecommendation(flipScore: number, trendDirection: TrendDirection): Recommendation {
  if (flipScore >= 70 && trendDirection === 'up') return 'SELL';
  if (flipScore >= 70 && trendDirection === 'down') return 'BUY';
  if (flipScore >= 60 && trendDirection === 'stable') return 'HOLD';
  return 'HOLD';
}

export function recommendationColor(rec: Recommendation): string {
  if (rec === 'SELL') return '#00FF87';
  if (rec === 'BUY') return '#00AAFF';
  return '#FFAA00';
}

export function recommendationLabel(rec: Recommendation): string {
  const map: Record<Recommendation, string> = {
    SELL: 'SELL / LIST NOW',
    BUY: 'BUY OPPORTUNITY',
    HOLD: 'HOLD',
  };
  return map[rec];
}

export function formatFlipScoreDescription(flipScore: number): string {
  if (flipScore >= 80) return 'Excellent flip potential';
  if (flipScore >= 60) return 'Good flip potential';
  if (flipScore >= 40) return 'Moderate flip potential';
  return 'Low flip potential';
}

export function computePortfolioChange(costBasis: number, estimatedValue: number): number {
  if (costBasis === 0) return 0;
  return ((estimatedValue - costBasis) / costBasis) * 100;
}

export function portfolioChangeColor(percentChange: number): string {
  if (percentChange > 0) return '#00FF87';
  if (percentChange < 0) return '#FF4444';
  return '#888888';
}
