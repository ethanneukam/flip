-- Phase 13: authoritative Flip commerce transactions (escrow + shipping + audit).
-- Backend-owned state; clients never infer truth.

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  buyer_id uuid REFERENCES users(id),
  seller_id uuid REFERENCES users(id),
  flip_item_id uuid REFERENCES flip_items(id),

  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',

  status text NOT NULL,

  escrow_status text NOT NULL DEFAULT 'pending',
  shipment_status text NOT NULL DEFAULT 'not_shipped',
  payout_status text NOT NULL DEFAULT 'locked',

  shipping_provider text,
  tracking_number text,
  label_url text,

  qr_code text,
  delivery_confirmed boolean NOT NULL DEFAULT false,

  idempotency_key text UNIQUE,
  last_event_hash text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT transactions_status_check CHECK (
    status IN (
      'created',
      'escrowed',
      'awaiting_shipment',
      'shipped',
      'in_transit',
      'delivered',
      'completed',
      'disputed',
      'refunded'
    )
  ),
  CONSTRAINT transactions_escrow_status_check CHECK (
    escrow_status IN ('pending', 'locked', 'released', 'refunded_hold')
  ),
  CONSTRAINT transactions_shipment_status_check CHECK (
    shipment_status IN ('not_shipped', 'shipped', 'in_transit', 'delivered')
  ),
  CONSTRAINT transactions_payout_status_check CHECK (
    payout_status IN ('locked', 'releasable', 'released', 'blocked')
  )
);

CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_id ON transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_flip_item_id ON transactions(flip_item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

CREATE TABLE IF NOT EXISTS transaction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  previous_state text NOT NULL,
  new_state text NOT NULL,
  trigger_source text NOT NULL CHECK (trigger_source IN ('api', 'webhook', 'admin', 'system')),
  event_id text,
  payload jsonb,
  event_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS transaction_events_event_id_unique
  ON transaction_events(event_id)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transaction_events_tx ON transaction_events(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_events_created ON transaction_events(created_at DESC);
