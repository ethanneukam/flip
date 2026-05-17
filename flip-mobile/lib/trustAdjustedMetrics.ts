/**
 * Phase 13.1 — trust-weighted view over raw market_identity metrics.
 * Raw DB fields stay authoritative; this output is for ranking + display only.
 */
import type { FraudRiskScore } from './fraudIntegrityEngine';

export type TrustAdjustedMetrics = {
  adjusted_liquidity: number;
  adjusted_market_rank: number;
  adjusted_reliability: number;
};

export type TrustAdjustmentSource = {
  liquidity_generated: number;
  /** Raw formula score (same as persisted `market_rank_score`). */
  market_rank_score: number;
  seller_fulfillment_score: number;
  transaction_reliability_score: number;
};

export function computeTrustAdjustedMetrics(
  src: TrustAdjustmentSource,
  fraud: FraudRiskScore
): TrustAdjustedMetrics {
  const { liquidity_multiplier, transaction_weight_multiplier, identity_weight_multiplier } =
    fraud.adjustments;

  const adjusted_liquidity = Math.max(0, Number(src.liquidity_generated) || 0) * liquidity_multiplier;

  const txBlend = 0.72 + 0.28 * transaction_weight_multiplier;
  const adjusted_market_rank = Math.max(
    0,
    (Number(src.market_rank_score) || 0) * identity_weight_multiplier * txBlend
  );

  const relBase =
    (Math.max(0, Math.min(100, Number(src.transaction_reliability_score) || 0)) * 0.52 +
      Math.max(0, Math.min(100, Number(src.seller_fulfillment_score) || 0)) * 0.48) *
    Math.min(liquidity_multiplier, transaction_weight_multiplier, identity_weight_multiplier);

  const adjusted_reliability = Math.round(Math.max(0, Math.min(100, relBase)) * 10) / 10;

  return {
    adjusted_liquidity: Math.round(adjusted_liquidity * 100) / 100,
    adjusted_market_rank: Math.round(adjusted_market_rank),
    adjusted_reliability,
  };
}
