-- 001_add_predictions.sql
-- Adds the predictions table and signal retry queue.
-- Depends on: 000_base_schema.sql (users, flip_items)

CREATE TABLE predictions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flip_item_id     UUID NOT NULL REFERENCES flip_items(id) ON DELETE CASCADE,
  prediction_type  TEXT NOT NULL CHECK (prediction_type IN ('price_up','price_down','overvalued','undervalued')),
  entry_price      NUMERIC(10,2) NOT NULL,
  target_price     NUMERIC(10,2),
  horizon_days     INTEGER NOT NULL DEFAULT 30,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','expired')),
  resolved_price   NUMERIC(10,2),
  outcome          TEXT CHECK (outcome IN ('correct','incorrect','inconclusive')),
  accuracy_delta   NUMERIC(5,4),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolves_at      TIMESTAMPTZ NOT NULL,
  resolved_at      TIMESTAMPTZ
);

CREATE INDEX idx_predictions_user_id      ON predictions(user_id);
CREATE INDEX idx_predictions_flip_item_id ON predictions(flip_item_id);
CREATE INDEX idx_predictions_status       ON predictions(status) WHERE status = 'pending';
CREATE INDEX idx_predictions_resolves_at  ON predictions(resolves_at) WHERE status = 'pending';

-- Signal retry queue: handles failures when the Supabase trigger
-- cannot reach the Vercel /api/compute-market-signal endpoint.
-- Non-blocking to the scan pipeline. Signals are eventual consistency only.
CREATE TABLE signal_retry_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flip_item_id    UUID NOT NULL REFERENCES flip_items(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','failed')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_attempt_at TIMESTAMPTZ
);

CREATE INDEX idx_signal_retry_pending ON signal_retry_queue(status) WHERE status = 'pending';
