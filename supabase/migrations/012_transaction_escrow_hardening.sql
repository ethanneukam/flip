-- Phase 13.2: escrow/shipment hardening — carrier lifecycle, idempotency store, audit, QR scans.

-- Idempotency for create / transition / webhook handlers (same key → same outcome).
CREATE TABLE IF NOT EXISTS transaction_idempotency (
  scope text NOT NULL,
  idempotency_key text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_transaction_idempotency_created ON transaction_idempotency(created_at DESC);

-- Append-only audit (API + console consumers).
CREATE TABLE IF NOT EXISTS transaction_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  category text NOT NULL,
  message text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_audit_tx ON transaction_audit_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_cat ON transaction_audit_log(category);

-- QR scan log (append-only).
CREATE TABLE IF NOT EXISTS transaction_qr_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_qr_scans_tx ON transaction_qr_scans(transaction_id);

-- Shipment + QR columns
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS shipment_id uuid;

UPDATE transactions SET shipment_id = gen_random_uuid() WHERE shipment_id IS NULL;

ALTER TABLE transactions
  ALTER COLUMN shipment_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN shipment_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_shipment_id ON transactions(shipment_id);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS carrier_shipment_state text NOT NULL DEFAULT 'CREATED';

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS tracking_number_present boolean NOT NULL DEFAULT false;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS carrier_confirmed boolean NOT NULL DEFAULT false;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS delivery_signature_received text;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS qr_nonce text;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS qr_expires_at timestamptz;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS qr_signature text;

DROP INDEX IF EXISTS transaction_events_event_id_unique;

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_carrier_shipment_state_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_carrier_shipment_state_check CHECK (
  carrier_shipment_state IN ('CREATED', 'LABEL_CREATED', 'IN_TRANSIT', 'DELIVERED')
);

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_escrow_status_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_escrow_status_check CHECK (
  escrow_status IN ('pending', 'locked', 'release_eligible', 'released', 'refunded_hold')
);

CREATE UNIQUE INDEX IF NOT EXISTS transaction_events_event_id_event_hash_unique
  ON transaction_events(event_id, event_hash)
  WHERE event_id IS NOT NULL AND event_hash IS NOT NULL;
