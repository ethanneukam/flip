import { RankTier } from '../types/models';

const TIER_THRESHOLDS: readonly number[] = [0, 35, 60, 80, 100];
const TIER_NAMES: readonly RankTier[] = ['Rookie', 'Analyst', 'Forecaster', 'Oracle'];

export function computeRank(repScore: number): RankTier {
  if (repScore >= 80) return 'Oracle';
  if (repScore >= 60) return 'Forecaster';
  if (repScore >= 35) return 'Analyst';
  return 'Rookie';
}

export function rankProgressPercent(repScore: number): number {
  for (let i = 0; i < TIER_THRESHOLDS.length - 1; i++) {
    if (repScore < TIER_THRESHOLDS[i + 1]) {
      const floor = TIER_THRESHOLDS[i];
      const ceiling = TIER_THRESHOLDS[i + 1];
      return Math.round(((repScore - floor) / (ceiling - floor)) * 100);
    }
  }
  return 100;
}

export function nextTierName(repScore: number): RankTier | null {
  const currentIndex = TIER_NAMES.indexOf(computeRank(repScore));
  if (currentIndex >= TIER_NAMES.length - 1) return null;
  return TIER_NAMES[currentIndex + 1];
}

export function pointsToNextTier(repScore: number): number {
  if (repScore >= 80) return 0;
  if (repScore >= 60) return Math.ceil(80 - repScore);
  if (repScore >= 35) return Math.ceil(60 - repScore);
  return Math.ceil(35 - repScore);
}
