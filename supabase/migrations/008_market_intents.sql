-- Behavioral market intent telemetry (Phase 11.1). No dedupe or analytics here.

CREATE TABLE IF NOT EXISTS market_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flip_item_id uuid NOT NULL REFERENCES flip_items(id) ON DELETE CASCADE,

  intent_type text NOT NULL
    CHECK (intent_type IN (
      'buy',
      'save',
      'skip',
      'inspect_seller'
    )),

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_intents_user_id_idx ON market_intents(user_id);
CREATE INDEX IF NOT EXISTS market_intents_flip_item_id_idx ON market_intents(flip_item_id);
CREATE INDEX IF NOT EXISTS market_intents_created_at_idx ON market_intents(created_at DESC);
