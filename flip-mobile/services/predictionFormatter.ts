import { Prediction, PredictionType, PredictionOutcome, PredictionStatus } from '../types/models';

export function formatPredictionType(type: PredictionType): string {
  const map: Record<PredictionType, string> = {
    price_up: 'Price Will Rise',
    price_down: 'Price Will Fall',
    overvalued: 'Overvalued',
    undervalued: 'Undervalued',
  };
  return map[type];
}

export function formatOutcome(outcome: PredictionOutcome): string {
  const map: Record<PredictionOutcome, string> = {
    correct: 'Correct',
    incorrect: 'Incorrect',
    inconclusive: 'Inconclusive',
  };
  return map[outcome];
}

export function formatStatus(status: PredictionStatus): string {
  const map: Record<PredictionStatus, string> = {
    pending: 'Pending',
    resolved: 'Resolved',
    expired: 'Expired',
  };
  return map[status];
}

export function formatAccuracyDelta(delta: number): string {
  const percent = (delta * 100).toFixed(1);
  if (delta > 0) return `+${percent}%`;
  if (delta < 0) return `${percent}%`;
  return '0%';
}

export function daysRemaining(resolvesAt: string): number {
  const diff = new Date(resolvesAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function formatTimeRemaining(resolvesAt: string): string {
  const days = daysRemaining(resolvesAt);
  if (days === 0) return 'Resolving soon';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

export function outcomeColor(outcome: PredictionOutcome): string {
  if (outcome === 'correct') return '#00FF87';
  if (outcome === 'incorrect') return '#FF4444';
  return '#888888';
}

export function predictionTypeIcon(type: PredictionType): string {
  const map: Record<PredictionType, string> = {
    price_up: '↑',
    price_down: '↓',
    overvalued: '⬇',
    undervalued: '⬆',
  };
  return map[type];
}

export function computePriceMovementPercent(entryPrice: number, resolvedPrice: number): number {
  if (entryPrice === 0) return 0;
  return ((resolvedPrice - entryPrice) / entryPrice) * 100;
}
