/**
 * Market rank authority (Phase 12). Centralizes scoring + tiering.
 *
 * Many inputs are still **estimated** from available signals (intents, listings,
 * predictions) because checkout/shipment lifecycles are not live yet. Call sites
 * and the recompute API document conservative estimation — never fabricate rows.
 *
 * Phase 13.1: optional **integrity bundle** overlays fraud-weighted adjusted scores;
 * persisted `market_rank_score` remains the raw formula output.
 */
import type { MarketRankResult, MarketTier, MarketRankInputs } from '../types/models';
import type { FraudRiskScore } from './fraudIntegrityEngine';
import { computeTrustAdjustedMetrics, type TrustAdjustedMetrics } from './trustAdjustedMetrics';

export type { MarketRankResult, MarketTier, MarketRankInputs } from '../types/models';
export type { FraudRiskScore } from './fraudIntegrityEngine';
export type { TrustAdjustedMetrics } from './trustAdjustedMetrics';

export type MarketIntegrityRankBundle = {
  fraud: FraudRiskScore;
  trustAdjusted: TrustAdjustedMetrics;
  raw_market_rank_score: number;
  adjusted_market_rank_score: number;
  rawResult: MarketRankResult;
  /** Tier + reliability reflect trust-adjusted signals; percentile is cohort on adjusted scores. */
  adjustedResult: MarketRankResult;
};

/** Map persisted `market_identity` row (+ optional prediction legacy) into rank inputs. */
export function marketIdentityRowToInputs(row: {
  completed_transactions: number;
  fulfilled_shipments: number;
  failed_transactions: number;
  liquidity_generated: number;
  total_market_volume: number;
  items_listed: number;
  items_sold: number;
  active_days: number;
  seller_fulfillment_score: number;
  transaction_reliability_score: number;
  predictions_legacy_score?: number;
}): MarketRankInputs {
  return {
    completed_transactions: Number(row.completed_transactions) || 0,
    fulfilled_shipments: Number(row.fulfilled_shipments) || 0,
    failed_transactions: Number(row.failed_transactions) || 0,
    liquidity_generated: Number(row.liquidity_generated) || 0,
    total_market_volume: Number(row.total_market_volume) || 0,
    items_listed: Number(row.items_listed) || 0,
    items_sold: Number(row.items_sold) || 0,
    active_days: Number(row.active_days) || 0,
    seller_fulfillment_score: Number(row.seller_fulfillment_score) || 0,
    transaction_reliability_score: Number(row.transaction_reliability_score) || 0,
    predictions_legacy_score: Number(row.predictions_legacy_score) || 0,
  };
}

/**
 * Single composite market rank score (higher = stronger market presence).
 * Weights: fulfilled_shipments & seller_fulfillment VERY HIGH; completed tx &
 * liquidity & volume HIGH; failed NEGATIVE; active_days MEDIUM; predictions LOW.
 */
export function computeMarketRankScore(i: MarketRankInputs): number {
  const fulfilled = i.fulfilled_shipments * 220;
  const completed = i.completed_transactions * 140;
  const liq = Math.log1p(Math.max(0, i.liquidity_generated)) * 185;
  const vol = Math.log1p(Math.max(0, i.total_market_volume)) * 160;
  const seller = i.seller_fulfillment_score * 2.75;
  const failPen = i.failed_transactions * 95;
  const days = i.active_days * 14;
  const legacy = Math.min(120, i.predictions_legacy_score * 0.42);
  return Math.round(Math.max(0, fulfilled + completed + liq + vol + seller - failPen + days + legacy));
}

/** Blended reliability for UI (0–100). */
export function computeReliabilityScore(i: MarketRankInputs): number {
  const tx = Math.max(0, Math.min(100, i.transaction_reliability_score));
  const sell = Math.max(0, Math.min(100, i.seller_fulfillment_score));
  const blended = tx * 0.52 + sell * 0.48;
  return Math.round(Math.max(0, Math.min(100, blended)) * 10) / 10;
}

/**
 * Tier from score thresholds + percentile + structural signals.
 * Not leaderboard positions — pure rules on stored metrics.
 */
export function computeMarketTier(
  market_rank_score: number,
  market_percentile: number,
  i: MarketRankInputs
): MarketTier {
  const p = market_percentile;
  const score = market_rank_score;
  const vol = i.total_market_volume;
  const liq = i.liquidity_generated;

  if (p >= 97 && score >= 780) return 'Liquidity Leader';
  if (p >= 88 && score >= 520 && (vol >= 4000 || liq >= 1500)) return 'Market Maker';
  if (i.seller_fulfillment_score >= 70 && i.items_sold >= 2 && i.completed_transactions >= 2) {
    return 'Verified Seller';
  }
  if (i.active_days >= 5 || score >= 380 || i.items_sold >= 1 || i.completed_transactions >= 1) {
    return 'Trader';
  }
  return 'Observer';
}

export function computeMarketRankResult(
  input: MarketRankInputs,
  /** 0–100, higher = better vs cohort (assigned by recompute job). */
  market_percentile: number
): MarketRankResult {
  const market_rank_score = computeMarketRankScore(input);
  const reliability_score = computeReliabilityScore(input);
  const tier = computeMarketTier(market_rank_score, market_percentile, input);
  return {
    market_rank_score,
    market_percentile: Math.round(market_percentile * 10) / 10,
    tier,
    reliability_score,
  };
}

/**
 * Raw rank (unchanged formula) + fraud overlay + trust-adjusted rank/tier.
 * `fraud` must be precomputed from `fraudIntegrityEngine.computeFraudRiskScore`.
 */
export function computeMarketRankIntegrityBundle(
  input: MarketRankInputs,
  market_percentile: number,
  fraud: FraudRiskScore
): MarketIntegrityRankBundle {
  const rawResult = computeMarketRankResult(input, market_percentile);
  const raw_market_rank_score = rawResult.market_rank_score;

  const trustAdjusted = computeTrustAdjustedMetrics(
    {
      liquidity_generated: input.liquidity_generated,
      market_rank_score: raw_market_rank_score,
      seller_fulfillment_score: input.seller_fulfillment_score,
      transaction_reliability_score: input.transaction_reliability_score,
    },
    fraud
  );

  const adjusted_market_rank_score = trustAdjusted.adjusted_market_rank;
  const adjustedInput: MarketRankInputs = {
    ...input,
    liquidity_generated: trustAdjusted.adjusted_liquidity,
  };

  const adjustedResult: MarketRankResult = {
    market_rank_score: adjusted_market_rank_score,
    market_percentile: rawResult.market_percentile,
    tier: computeMarketTier(adjusted_market_rank_score, market_percentile, adjustedInput),
    reliability_score: trustAdjusted.adjusted_reliability,
  };

  return {
    fraud,
    trustAdjusted,
    raw_market_rank_score,
    adjusted_market_rank_score,
    rawResult,
    adjustedResult,
  };
}

/**
 * Assign percentile 0–100 (higher = better) from a map of userId → raw score.
 * Tied scores share the best (lowest) rank among the tie group.
 */
export function assignPercentiles(scoresByUser: Record<string, number>): Record<string, number> {
  const pairs = Object.entries(scoresByUser).filter(([, s]) => Number.isFinite(s));
  pairs.sort((a, b) => b[1] - a[1]);
  const n = pairs.length;
  const out: Record<string, number> = {};
  if (n === 0) return out;
  if (n === 1) {
    out[pairs[0][0]] = 100;
    return out;
  }
  let i = 0;
  while (i < n) {
    let j = i + 1;
    while (j < n && pairs[j][1] === pairs[i][1]) j++;
    const rank = i;
    const pct = Math.round(((n - 1 - rank) / (n - 1)) * 1000) / 10;
    for (let k = i; k < j; k++) out[pairs[k][0]] = pct;
    i = j;
  }
  return out;
}
