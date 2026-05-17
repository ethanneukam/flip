/**
 * Phase 13.3 — read-only transaction "truth" view + event log consistency evaluation.
 * getTransactionTruthView does not mutate. assertTransactionEventConsistency enforces flags.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { logTransactionAudit } from './transactionAuditLog';

export type TransactionEventRow = {
  previous_state: string;
  new_state: string;
  sequence_number: number;
};

/** Derive lifecycle status by replaying ordered events from an implicit start of `created`. */
export function deriveStatusFromEventRows(events: TransactionEventRow[]): string {
  if (!events.length) return 'created';
  const sorted = [...events].sort((a, b) => (a.sequence_number ?? 0) - (b.sequence_number ?? 0));
  let expected = 'created';
  for (const e of sorted) {
    if (e.previous_state !== expected) {
      return '__broken_chain__';
    }
    expected = e.new_state;
  }
  return expected;
}

/** Pure evaluation — no writes. */
export function evaluateTransactionEventConsistency(
  storedStatus: string | null | undefined,
  events: TransactionEventRow[]
): { ok: boolean; derivedStatus: string; storedStatus: string | null; reason?: string } {
  const derived = deriveStatusFromEventRows(events);
  if (derived === '__broken_chain__') {
    return { ok: false, derivedStatus: derived, storedStatus: storedStatus ?? null, reason: 'broken_event_chain' };
  }
  if (storedStatus != null && storedStatus !== derived) {
    return { ok: false, derivedStatus: derived, storedStatus, reason: 'status_mismatch' };
  }
  return { ok: true, derivedStatus: derived, storedStatus: storedStatus ?? null };
}

/**
 * Enforcing consistency pass: if log and row disagree (or chain is broken), set `inconsistent_state` and audit.
 * Call after transitions and webhook applies; not used inside getTransactionTruthView.
 */
export async function assertTransactionEventConsistency(
  client: SupabaseClient,
  transactionId: string
): Promise<{
  ok: boolean;
  storedStatus: string | null;
  derivedStatus: string;
  detail?: string;
}> {
  const { data: tx } = await client
    .from('transactions')
    .select('id, status, inconsistent_state')
    .eq('id', transactionId)
    .maybeSingle();

  const { data: evs } = await client
    .from('transaction_events')
    .select('previous_state, new_state, sequence_number')
    .eq('transaction_id', transactionId)
    .order('sequence_number', { ascending: true });

  const evald = evaluateTransactionEventConsistency(tx?.status as string | undefined, (evs ?? []) as TransactionEventRow[]);

  if (!evald.ok) {
    const detail = `${evald.reason}: stored=${evald.storedStatus} derived=${evald.derivedStatus}`;
    await client
      .from('transactions')
      .update({ inconsistent_state: true, updated_at: new Date().toISOString() })
      .eq('id', transactionId);

    await logTransactionAudit(client, {
      transactionId,
      category: 'consistency_error',
      message: 'assertTransactionEventConsistency',
      payload: { detail },
    });
    return {
      ok: false,
      storedStatus: evald.storedStatus,
      derivedStatus: evald.derivedStatus,
      detail,
    };
  }

  return { ok: true, storedStatus: evald.storedStatus, derivedStatus: evald.derivedStatus };
}

export type TransactionTruthView = {
  transaction: Record<string, unknown> | null;
  eventsOrdered: Record<string, unknown>[];
  bufferedPending: Record<string, unknown>[];
  escrow: {
    escrow_status: unknown;
    escrow_release_attempted_at: unknown;
    escrow_released_at: unknown;
    payout_status: unknown;
  };
  derivedStatusFromEvents: string;
  consistencyEvaluation: { ok: boolean; reason?: string };
  inconsistent_state: boolean;
};

/** Read-only aggregate for debugging / support (does not clear or repair inconsistency). */
export async function getTransactionTruthView(
  client: SupabaseClient,
  transactionId: string
): Promise<TransactionTruthView> {
  const { data: transaction } = await client.from('transactions').select('*').eq('id', transactionId).maybeSingle();

  const { data: eventsOrdered } = await client
    .from('transaction_events')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('sequence_number', { ascending: true });

  const { data: bufferedPending } = await client
    .from('transaction_event_buffer')
    .select('*')
    .eq('transaction_id', transactionId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const evRows = (eventsOrdered ?? []).map((e) => ({
    previous_state: e.previous_state as string,
    new_state: e.new_state as string,
    sequence_number: Number(e.sequence_number ?? 0),
  }));

  const derivedStatusFromEvents = deriveStatusFromEventRows(evRows);
  const evald = evaluateTransactionEventConsistency(transaction?.status as string | undefined, evRows);

  return {
    transaction: transaction as Record<string, unknown> | null,
    eventsOrdered: (eventsOrdered ?? []) as Record<string, unknown>[],
    bufferedPending: (bufferedPending ?? []) as Record<string, unknown>[],
    escrow: {
      escrow_status: transaction?.escrow_status,
      escrow_release_attempted_at: transaction?.escrow_release_attempted_at,
      escrow_released_at: transaction?.escrow_released_at,
      payout_status: transaction?.payout_status,
    },
    derivedStatusFromEvents,
    consistencyEvaluation: { ok: evald.ok, reason: evald.reason },
    inconsistent_state: Boolean(transaction?.inconsistent_state),
  };
}
