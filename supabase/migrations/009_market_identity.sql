-- Phase 12: parallel market identity layer (does not replace rep_score).

CREATE TABLE IF NOT EXISTS market_identity (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  completed_transactions integer NOT NULL DEFAULT 0,
  fulfilled_shipments integer NOT NULL DEFAULT 0,
  failed_transactions integer NOT NULL DEFAULT 0,

  liquidity_generated numeric NOT NULL DEFAULT 0,
  total_market_volume numeric NOT NULL DEFAULT 0,

  items_listed integer NOT NULL DEFAULT 0,
  items_sold integer NOT NULL DEFAULT 0,
  active_days integer NOT NULL DEFAULT 0,

  seller_fulfillment_score numeric NOT NULL DEFAULT 0,
  transaction_reliability_score numeric NOT NULL DEFAULT 0,

  market_rank_score numeric NOT NULL DEFAULT 0,
  market_percentile numeric NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_identity_rank_idx ON market_identity(market_rank_score DESC);
CREATE INDEX IF NOT EXISTS market_identity_percentile_idx ON market_identity(market_percentile DESC);
CREATE INDEX IF NOT EXISTS market_identity_liquidity_idx ON market_identity(liquidity_generated DESC);
