-- Phase 15: idempotency row can be claimed before handler finishes (response NULL),
-- eliminating parallel duplicate-handler races for the same (scope, key).

ALTER TABLE transaction_idempotency
  ALTER COLUMN response DROP NOT NULL;

ALTER TABLE transaction_idempotency
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN transaction_idempotency.response IS
  'Final idempotent JSON payload when complete; NULL while handler is in-flight.';
COMMENT ON COLUMN transaction_idempotency.claimed_at IS
  'When the idempotency row was inserted; used to recover stale NULL claims.';
