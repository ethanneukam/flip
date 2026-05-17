-- Phase 13.1: trust / fraud annotations on market_identity (raw metrics preserved).

ALTER TABLE market_identity
  ADD COLUMN IF NOT EXISTS raw_market_rank_score numeric NOT NULL DEFAULT 0;

ALTER TABLE market_identity
  ADD COLUMN IF NOT EXISTS adjusted_market_rank_score numeric NOT NULL DEFAULT 0;

ALTER TABLE market_identity
  ADD COLUMN IF NOT EXISTS fraud_risk_score numeric NOT NULL DEFAULT 0;

ALTER TABLE market_identity
  ADD COLUMN IF NOT EXISTS fraud_risk_level text NOT NULL DEFAULT 'LOW';

ALTER TABLE market_identity
  ADD COLUMN IF NOT EXISTS fraud_flags jsonb NOT NULL DEFAULT '[]'::jsonb;
