/**
 * Phase 13.1 — backend fraud / trust heuristics (annotate + weight only).
 * Does not block users, delete data, or touch payments / escrow / pricing.
 */
export type FraudRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type FraudRiskScore = {
  user_id: string;
  fraud_risk_score: number;
  risk_level: FraudRiskLevel;
  flags: string[];
  adjustments: {
    liquidity_multiplier: number;
    transaction_weight_multiplier: number;
    identity_weight_multiplier: number;
  };
};

/** Aggregates assembled by `recompute-market-identity` (no raw row mutation). */
export type FraudSignalsInput = {
  user_id: string;
  intent_type_counts: Record<string, number>;
  /** Intents in the last 24h (velocity). */
  intents_last_24h: number;
  /** Intents in the last 60 minutes (burst). */
  intents_last_60m: number;
  buy_intents: number;
  save_intents: number;
  skip_intents: number;
  /** Completed Flip transactions where user is buyer (Phase 13 table). */
  buyer_completed_tx: number;
  /** Max count for same (buyer, seller, flip_item) triple involving this user. */
  max_repeat_pair_item_tx: number;
  /** Count of distinct partners with ≥1 tx each direction buyer↔seller (coarse circularity). */
  circular_trade_pairs: number;
  liquidity_generated: number;
  completed_transactions: number;
  items_listed: number;
  items_sold: number;
  cancelled_listings: number;
  /** flip_items rows for this user (creation churn proxy). */
  flip_items_count: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function levelFromScore(score: number): FraudRiskLevel {
  if (score <= 25) return 'LOW';
  if (score <= 45) return 'MEDIUM';
  if (score <= 70) return 'HIGH';
  return 'CRITICAL';
}

function multFromRisk(score: number, tightness: number): number {
  return clamp(1 - score / tightness, 0.32, 1);
}

/**
 * Deterministic heuristic risk score (0–100) + multipliers for trust adjustment.
 */
export function computeFraudRiskScore(s: FraudSignalsInput): FraudRiskScore {
  const flags: string[] = [];
  let score = 0;

  const inspect = s.intent_type_counts.inspect_seller ?? 0;
  const totalIntents = s.buy_intents + s.save_intents + s.skip_intents + inspect;

  const save = s.save_intents;
  const skip = s.skip_intents;
  const buy = s.buy_intents;

  if (totalIntents >= 40 && skip / (totalIntents + 1) > 0.88 && save / (totalIntents + 1) > 0.08) {
    flags.push('intent_spam');
    score += 22;
  }

  if (s.intents_last_60m >= 25 && totalIntents >= 30) {
    flags.push('intent_velocity_spike');
    score += 18;
  }

  if (s.intents_last_24h >= 120) {
    flags.push('intent_velocity_daily_spike');
    score += 12;
  }

  if (buy >= 12 && s.buyer_completed_tx === 0 && s.completed_transactions < 2) {
    flags.push('buy_abuse_pattern');
    score += 20;
  }

  if (s.max_repeat_pair_item_tx >= 4) {
    flags.push('wash_trading_suspected');
    score += 24;
  }

  if (s.circular_trade_pairs >= 3) {
    flags.push('circular_liquidity_flow');
    score += 16;
  }

  if (s.liquidity_generated >= 400 && s.completed_transactions <= 1 && buy >= 8) {
    flags.push('synthetic_liquidity');
    score += 18;
  }

  if (s.items_listed >= 14 && s.items_sold <= 1 && s.cancelled_listings >= 6) {
    flags.push('listing_abuse_pattern');
    score += 14;
  }

  if (s.flip_items_count >= 25 && s.items_sold <= 1) {
    flags.push('listing_churn_without_sales');
    score += 10;
  }

  score = clamp(Math.round(score), 0, 100);

  const fraud_risk_score = score;
  const risk_level = levelFromScore(fraud_risk_score);

  const adjustments = {
    liquidity_multiplier: multFromRisk(fraud_risk_score, 200),
    transaction_weight_multiplier: multFromRisk(fraud_risk_score, 160),
    identity_weight_multiplier: multFromRisk(fraud_risk_score, 140),
  };

  return {
    user_id: s.user_id,
    fraud_risk_score,
    risk_level,
    flags,
    adjustments,
  };
}
