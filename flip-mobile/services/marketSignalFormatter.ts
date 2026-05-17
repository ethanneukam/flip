import { MarketSignal, MarketVelocity, TrendDirection, ConfidenceReason } from '../types/models';

export function formatPrice(cents: number): string {
  return `$${cents.toFixed(2)}`;
}

export function formatPriceRange(signal: MarketSignal): string {
  return `${formatPrice(signal.lowPrice)} – ${formatPrice(signal.highPrice)}`;
}

export function formatScoreLabel(score: number): string {
  if (score >= 80) return 'Very High';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Low';
  return 'Very Low';
}

export function formatVelocity(velocity: MarketVelocity): string {
  const map: Record<MarketVelocity, string> = {
    fast: 'Fast Moving',
    medium: 'Normal Pace',
    slow: 'Slow Moving',
    stagnant: 'Stagnant',
  };
  return map[velocity];
}

export function formatTrendDirection(direction: TrendDirection, percent: number): string {
  if (direction === 'up') return `↑ +${percent.toFixed(1)}%`;
  if (direction === 'down') return `↓ -${Math.abs(percent).toFixed(1)}%`;
  return '→ Stable';
}

export function formatConfidenceReason(reason: ConfidenceReason): string {
  const map: Record<ConfidenceReason, string> = {
    sufficient_history: 'Based on verified market data',
    category_baseline: 'Based on category averages',
    ai_estimate_only: 'AI estimate — limited market data',
  };
  return map[reason];
}

export function scoreColor(score: number): string {
  if (score >= 70) return '#00FF87';
  if (score >= 40) return '#FFAA00';
  return '#FF4444';
}

export function trendColor(direction: TrendDirection): string {
  if (direction === 'up') return '#00FF87';
  if (direction === 'down') return '#FF4444';
  return '#888888';
}

export function isSignalExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}
