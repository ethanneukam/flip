-- 000_base_schema.sql
-- Foundational tables for the Flip system.
-- Must be applied before any subsequent migrations.

CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT UNIQUE NOT NULL,
  username            TEXT UNIQUE NOT NULL,
  display_name        TEXT,
  avatar_url          TEXT,
  rep_score           NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_flips         INTEGER NOT NULL DEFAULT 0,
  verified            BOOLEAN NOT NULL DEFAULT false,
  is_pro              BOOLEAN NOT NULL DEFAULT false,
  daily_scan_count    INTEGER NOT NULL DEFAULT 0,
  scan_limit          INTEGER NOT NULL DEFAULT 5,
  scans_reset_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expo_push_token     TEXT,
  notification_prefs  JSONB NOT NULL DEFAULT '{
    "PRICE_SPIKE": true,
    "PRICE_DROP": true,
    "DEMAND_SURGE": true,
    "PORTFOLIO_GAIN": false,
    "PORTFOLIO_LOSS": true,
    "RANK_UP": true,
    "PREDICTION_RESOLVED": true
  }',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flip_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL,
  subcategory     TEXT,
  brand           TEXT,
  model           TEXT,
  condition       TEXT NOT NULL CHECK (condition IN ('mint','excellent','good','fair','poor')),
  ai_confidence   NUMERIC(5,2) NOT NULL DEFAULT 0,
  image_urls      TEXT[] NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','listed','sold','archived')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_signals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flip_item_id        UUID NOT NULL REFERENCES flip_items(id) ON DELETE CASCADE,
  avg_price           NUMERIC(10,2) NOT NULL,
  low_price           NUMERIC(10,2) NOT NULL,
  high_price          NUMERIC(10,2) NOT NULL,
  recommended_price   NUMERIC(10,2) NOT NULL,
  demand_score        NUMERIC(5,2) NOT NULL DEFAULT 50,
  supply_score        NUMERIC(5,2) NOT NULL DEFAULT 50,
  flip_score          NUMERIC(5,2) NOT NULL DEFAULT 50,
  velocity            TEXT NOT NULL DEFAULT 'medium' CHECK (velocity IN ('fast','medium','slow','stagnant')),
  trend_direction     TEXT NOT NULL DEFAULT 'stable' CHECK (trend_direction IN ('up','down','stable')),
  trend_percent       NUMERIC(6,2) NOT NULL DEFAULT 0,
  data_sources        TEXT[] NOT NULL DEFAULT '{}',
  low_confidence      BOOLEAN NOT NULL DEFAULT false,
  confidence_reason   TEXT CHECK (confidence_reason IN ('sufficient_history','category_baseline','ai_estimate_only')),
  data_points_used    INTEGER,
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE TABLE IF NOT EXISTS listings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flip_item_id  UUID NOT NULL REFERENCES flip_items(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asking_price  NUMERIC(10,2) NOT NULL,
  final_price   NUMERIC(10,2),
  platform      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','sold','cancelled')),
  views         INTEGER NOT NULL DEFAULT 0,
  offers        INTEGER NOT NULL DEFAULT 0,
  listed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  sold_at       TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS portfolio_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flip_item_id     UUID NOT NULL REFERENCES flip_items(id) ON DELETE CASCADE,
  cost_basis       NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_value  NUMERIC(10,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'holding' CHECK (status IN ('holding','sold','watchlist')),
  added_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flip_item_id  UUID NOT NULL REFERENCES flip_items(id) ON DELETE CASCADE,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, flip_item_id)
);

-- Fed by external pipeline
CREATE TABLE IF NOT EXISTS price_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category     TEXT NOT NULL,
  subcategory  TEXT,
  brand        TEXT,
  model        TEXT,
  condition    TEXT,
  price        NUMERIC(10,2) NOT NULL,
  source       TEXT NOT NULL,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_logs_lookup ON price_logs(category, subcategory, brand, model);

CREATE TABLE IF NOT EXISTS flip_price (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL UNIQUE,
  avg_price   NUMERIC(10,2) NOT NULL,
  low_price   NUMERIC(10,2) NOT NULL,
  high_price  NUMERIC(10,2) NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
