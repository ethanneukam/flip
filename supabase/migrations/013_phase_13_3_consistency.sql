-- Phase 13.3: strict event ordering, escrow release locks, webhook buffer, QR nonce replay protection.

-- Monotonic event sequence per transaction (server-side trigger).
ALTER TABLE transaction_events
  ADD COLUMN IF NOT EXISTS sequence_number integer;

UPDATE transaction_events e
SET sequence_number = s.seq
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY transaction_id ORDER BY created_at) AS seq
  FROM transaction_events
) s
WHERE e.id = s.id AND (e.sequence_number IS NULL OR e.sequence_number <> s.seq);

ALTER TABLE transaction_events
  ALTER COLUMN sequence_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transaction_events_tx_sequence
  ON transaction_events(transaction_id, sequence_number);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS last_event_sequence integer NOT NULL DEFAULT 0;

UPDATE transactions t
SET last_event_sequence = COALESCE(m.mx, 0)
FROM (
  SELECT transaction_id, MAX(sequence_number) AS mx
  FROM transaction_events
  GROUP BY transaction_id
) m
WHERE t.id = m.transaction_id;

UPDATE transactions SET last_event_sequence = 0 WHERE last_event_sequence IS NULL;

CREATE OR REPLACE FUNCTION assign_transaction_event_sequence()
RETURNS TRIGGER AS $$
DECLARE
  nextseq integer;
BEGIN
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO nextseq
  FROM transaction_events
  WHERE transaction_id = NEW.transaction_id;

  NEW.sequence_number := nextseq;

  UPDATE transactions
  SET last_event_sequence = nextseq
  WHERE id = NEW.transaction_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_transaction_event_sequence ON transaction_events;
CREATE TRIGGER trg_assign_transaction_event_sequence
  BEFORE INSERT ON transaction_events
  FOR EACH ROW
  EXECUTE FUNCTION assign_transaction_event_sequence();

-- Consistency + escrow release audit fields
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS inconsistent_state boolean NOT NULL DEFAULT false;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS escrow_release_attempted_at timestamptz;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS escrow_released_at timestamptz;

-- At most one escrow release timestamp per row (application enforces; index supports lookups)
CREATE INDEX IF NOT EXISTS idx_transactions_escrow_released_at
  ON transactions(escrow_released_at)
  WHERE escrow_released_at IS NOT NULL;

-- Buffered out-of-order webhook / carrier events
CREATE TABLE IF NOT EXISTS transaction_event_buffer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'discarded')),
  payload jsonb NOT NULL,
  event_id text,
  event_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tx_event_buffer_tx_status_created
  ON transaction_event_buffer(transaction_id, status, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tx_event_buffer_event_dedupe
  ON transaction_event_buffer(event_id, event_hash)
  WHERE event_id IS NOT NULL AND event_hash IS NOT NULL;

-- QR nonce consumed exactly once per transaction
CREATE TABLE IF NOT EXISTS transaction_qr_nonces_used (
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  nonce text NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (transaction_id, nonce)
);

ALTER TABLE transaction_qr_scans
  ADD COLUMN IF NOT EXISTS geo_hint text;

ALTER TABLE transaction_qr_scans
  ADD COLUMN IF NOT EXISTS device_hint text;
