/**
 * Phase 13.2 — minimal transaction observability (DB + console).
 * Used from Next API routes only (Node); passes Supabase service client when logging to DB.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type AuditCategory =
  | 'state_transition'
  | 'webhook_ingest'
  | 'payout_attempt'
  | 'qr_scan'
  | 'idempotency_replay'
  | 'consistency_error'
  | 'buffer_write'
  | 'buffer_apply';

export async function logTransactionAudit(
  client: SupabaseClient | null,
  entry: {
    transactionId?: string | null;
    category: AuditCategory;
    message: string;
    payload?: Record<string, unknown>;
  }
): Promise<void> {
  const line = `[TX_AUDIT] ${entry.category} ${entry.message}`;
  if (entry.payload) console.info(line, entry.payload);
  else console.info(line);

  if (!client) return;
  try {
    await client.from('transaction_audit_log').insert({
      transaction_id: entry.transactionId ?? null,
      category: entry.category,
      message: entry.message,
      payload: entry.payload ?? null,
    });
  } catch (e) {
    console.warn('[TX_AUDIT_DB_FAIL]', e);
  }
}
