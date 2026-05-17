import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import {
  type FlipTransactionStatus,
  type CarrierShipmentState,
  canTransactionStatusTransition,
  escrowForTransactionStatus,
  payoutForTransactionStatus,
  shipmentStatusForTransactionStatus,
  resolveCarrierAfterTransition,
  buildQrForTransaction,
  assertPatchImmutableSafe,
  assertDeliveredAllowed,
  releaseEligibilityCheck,
} from '../../flip-mobile/lib/transactionStateMachine';
import { logTransactionAudit } from '../../flip-mobile/lib/transactionAuditLog';
import { ensureIdempotentMutation } from './lib/ensureIdempotentMutation';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FLIP_ADMIN_SECRET = process.env.FLIP_ADMIN_SECRET;
const SHIPMENT_QR_SECRET = process.env.FLIP_SHIPMENT_QR_SECRET ?? process.env.TRANSACTION_WEBHOOK_SECRET ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export type { FlipTransactionStatus };
export type TransitionTrigger = 'api' | 'webhook' | 'admin' | 'system';

export function isAdminRequest(req: NextApiRequest): boolean {
  const h = req.headers['x-flip-admin-secret'];
  return typeof h === 'string' && !!FLIP_ADMIN_SECRET && h === FLIP_ADMIN_SECRET;
}

function chainEventHash(parts: (string | null | undefined)[]): string {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

/**
 * Stripe Connect payout release is stubbed — escrow must not release until
 * releaseEligibilityCheck passes (completed + delivery_confirmed + escrow + fraud + disputes).
 */
async function finalizePayoutIfEligible(client: SupabaseClient, row: Record<string, unknown>): Promise<void> {
  if (row.status !== 'completed' || !row.delivery_confirmed) return;

  const elig = await releaseEligibilityCheck(client, {
    id: row.id as string,
    status: row.status as string,
    delivery_confirmed: !!row.delivery_confirmed,
    escrow_status: row.escrow_status as string,
    seller_id: (row.seller_id as string) ?? null,
  });

  if (!elig.ok) {
    await logTransactionAudit(client, {
      transactionId: row.id as string,
      category: 'payout_attempt',
      message: 'blocked_by_release_gate',
      payload: { reasons: elig.reasons },
    });
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.info('[PAYOUT_ELIGIBLE_NO_STRIPE]', row.id);
  } else {
    console.info('[PAYOUT_ELIGIBLE_CONNECT]', row.id);
  }

  await logTransactionAudit(client, {
    transactionId: row.id as string,
    category: 'payout_attempt',
    message: 'stripe_stub_release',
    payload: {},
  });

  await client
    .from('transactions')
    .update({
      escrow_status: 'released',
      payout_status: 'released',
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id as string);
}

export type ApplyTransitionOpts = {
  transactionId: string;
  toStatus: FlipTransactionStatus;
  trigger: TransitionTrigger;
  eventId?: string | null;
  /** Deterministic webhook body hash — pairs with event_id for DB dedupe. */
  incomingEventHash?: string | null;
  isAdmin?: boolean;
  actorUserId?: string | null;
  deliveryConfirmed?: boolean;
  shipmentPatch?: Partial<{
    shipping_provider: string;
    tracking_number: string;
    label_url: string;
    delivery_signature_received: string | null;
  }>;
  webhookDelivered?: boolean;
  carrierConfirmedIncoming?: boolean;
  deliverySignatureProof?: string | null;
};

export type ApplyTransitionResult =
  | { ok: true; transaction: Record<string, unknown>; ignored?: boolean }
  | { ok: false; error: string; status: number };

export async function applyTransactionTransition(
  client: SupabaseClient,
  opts: ApplyTransitionOpts
): Promise<ApplyTransitionResult> {
  const { data: row, error: fetchErr } = await client
    .from('transactions')
    .select('*')
    .eq('id', opts.transactionId)
    .single();

  if (fetchErr || !row) {
    return { ok: false, error: 'Transaction not found', status: 404 };
  }

  const from = row.status as string;
  const to = opts.toStatus;
  const admin = !!opts.isAdmin;

  if (opts.eventId && opts.incomingEventHash) {
    const { data: dup } = await client
      .from('transaction_events')
      .select('id')
      .eq('transaction_id', opts.transactionId)
      .eq('event_id', opts.eventId)
      .eq('event_hash', opts.incomingEventHash)
      .maybeSingle();
    if (dup) {
      const { data: latest } = await client.from('transactions').select('*').eq('id', opts.transactionId).single();
      await logTransactionAudit(client, {
        transactionId: opts.transactionId,
        category: 'idempotency_replay',
        message: 'webhook_event_duplicate',
        payload: { event_id: opts.eventId },
      });
      return { ok: true, transaction: (latest ?? row) as Record<string, unknown>, ignored: true };
    }
  }

  if (!canTransactionStatusTransition(from, to, admin)) {
    return { ok: false, error: `Invalid transition ${from} → ${to}`, status: 409 };
  }

  if (to === 'completed') {
    const confirmed = opts.deliveryConfirmed ?? row.delivery_confirmed;
    if (!confirmed) {
      return { ok: false, error: 'completed requires delivery_confirmed', status: 400 };
    }
    if (from !== 'delivered') {
      return { ok: false, error: 'completed is only valid from delivered', status: 400 };
    }
  }

  const prevCarrier = (row.carrier_shipment_state as CarrierShipmentState) ?? 'CREATED';
  const trackingNumberPresent = !!(
    row.tracking_number ||
    (opts.shipmentPatch?.tracking_number && String(opts.shipmentPatch.tracking_number).length > 0)
  );
  const carrierConfirmed =
    !!row.carrier_confirmed ||
    !!opts.carrierConfirmedIncoming ||
    !!opts.webhookDelivered;

  const expectedSignatureFromPatch =
    opts.shipmentPatch && 'delivery_signature_received' in opts.shipmentPatch
      ? opts.shipmentPatch.delivery_signature_received
      : undefined;
  const expectedSignature =
    expectedSignatureFromPatch !== undefined
      ? expectedSignatureFromPatch
      : (row.delivery_signature_received as string | null | undefined);

  if (to === 'delivered') {
    const deliveredCheck = assertDeliveredAllowed(
      prevCarrier,
      carrierConfirmed,
      !!opts.webhookDelivered,
      expectedSignature,
      opts.deliverySignatureProof
    );
    if (!deliveredCheck.ok) {
      return { ok: false, error: deliveredCheck.error, status: 409 };
    }
  }

  const escrow = escrowForTransactionStatus(to);
  const payout = payoutForTransactionStatus(to);
  const shipmentHuman = shipmentStatusForTransactionStatus(to);
  const now = new Date().toISOString();

  const nextCarrier = resolveCarrierAfterTransition(prevCarrier, to, {
    trackingNumberPresent,
    carrierConfirmed,
    webhookDelivered: !!opts.webhookDelivered,
  });

  const chainHash = chainEventHash([
    row.last_event_hash ?? '',
    row.id,
    from,
    to,
    now,
    opts.eventId ?? '',
    opts.trigger,
    opts.incomingEventHash ?? '',
  ]);
  const eventRowHash = opts.incomingEventHash ?? chainHash;

  const patch: Record<string, unknown> = {
    status: to,
    escrow_status: escrow,
    shipment_status: shipmentHuman,
    payout_status: payout,
    carrier_shipment_state: nextCarrier,
    tracking_number_present: trackingNumberPresent,
    carrier_confirmed: carrierConfirmed,
    updated_at: now,
    last_event_hash: chainHash,
  };

  if (opts.shipmentPatch?.shipping_provider) {
    patch.shipping_provider = opts.shipmentPatch.shipping_provider;
  }
  if (opts.shipmentPatch?.tracking_number) {
    patch.tracking_number = opts.shipmentPatch.tracking_number;
    patch.tracking_number_present = true;
  }
  if (opts.shipmentPatch?.label_url) {
    patch.label_url = opts.shipmentPatch.label_url;
  }
  if (opts.shipmentPatch && 'delivery_signature_received' in opts.shipmentPatch) {
    patch.delivery_signature_received = opts.shipmentPatch.delivery_signature_received;
  }

  if (opts.deliveryConfirmed === true) {
    patch.delivery_confirmed = true;
  }
  if (to === 'delivered') {
    patch.delivery_confirmed = true;
  }

  if (to === 'awaiting_shipment' && !row.qr_code) {
    if (!SHIPMENT_QR_SECRET) {
      return { ok: false, error: 'FLIP_SHIPMENT_QR_SECRET (or TRANSACTION_WEBHOOK_SECRET) not configured', status: 500 };
    }
    const shipmentId = String(row.shipment_id);
    const qr = buildQrForTransaction({
      secret: SHIPMENT_QR_SECRET,
      transactionId: row.id as string,
      shipmentId,
      ttlMs: 7 * 24 * 60 * 60 * 1000,
    });
    patch.qr_nonce = qr.nonce;
    patch.qr_expires_at = qr.expires_at;
    patch.qr_signature = qr.signature;
    patch.qr_code = Buffer.from(
      JSON.stringify({ ...qr.payload, signature: qr.signature }),
      'utf8'
    ).toString('base64url');
  }

  const safe = assertPatchImmutableSafe(patch);
  if (!safe.ok) {
    return { ok: false, error: safe.error, status: 403 };
  }

  const { error: evInsErr } = await client.from('transaction_events').insert({
    transaction_id: row.id,
    previous_state: from,
    new_state: to,
    trigger_source: opts.trigger,
    event_id: opts.eventId ?? null,
    payload: {
      shipmentPatch: opts.shipmentPatch ?? null,
      actor: opts.actorUserId ?? null,
      incomingEventHash: opts.incomingEventHash ?? null,
    },
    event_hash: eventRowHash,
  });

  if (evInsErr) {
    if (evInsErr.code === '23505' && opts.eventId && opts.incomingEventHash) {
      const { data: latest } = await client.from('transactions').select('*').eq('id', opts.transactionId).single();
      await logTransactionAudit(client, {
        transactionId: opts.transactionId,
        category: 'idempotency_replay',
        message: 'webhook_event_race_duplicate',
        payload: { event_id: opts.eventId },
      });
      return { ok: true, transaction: (latest ?? row) as Record<string, unknown>, ignored: true };
    }
    return { ok: false, error: evInsErr.message, status: 500 };
  }

  const { data: updated, error: upErr } = await client
    .from('transactions')
    .update(patch)
    .eq('id', row.id)
    .select('*')
    .single();

  if (upErr || !updated) {
    return { ok: false, error: upErr?.message ?? 'Update failed', status: 500 };
  }

  await logTransactionAudit(client, {
    transactionId: row.id as string,
    category: 'state_transition',
    message: `${from} → ${to}`,
    payload: { trigger: opts.trigger, event_id: opts.eventId ?? null },
  });

  if (to === 'completed' && updated.delivery_confirmed) {
    await finalizePayoutIfEligible(client, updated as Record<string, unknown>);
    const { data: finalRow } = await client.from('transactions').select('*').eq('id', row.id).single();
    return { ok: true, transaction: (finalRow ?? updated) as Record<string, unknown> };
  }

  return { ok: true, transaction: updated as Record<string, unknown> };
}

type IdempotentHttpPayload = { status: number; body: Record<string, unknown> };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const admin = isAdminRequest(req);
  const body = req.body ?? {};
  const transactionId = body.transaction_id as string | undefined;
  const toStatus = body.to_status as FlipTransactionStatus | undefined;
  const deliveryConfirmed = Boolean(body.delivery_confirmed);
  const idempotencyKey = (body.idempotency_key as string | undefined)?.trim();

  if (!transactionId || !toStatus) {
    return res.status(400).json({ error: 'transaction_id and to_status required' });
  }
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'idempotency_key required' });
  }

  const { data: row } = await supabase
    .from('transactions')
    .select('buyer_id, seller_id')
    .eq('id', transactionId)
    .single();
  if (!row) return res.status(404).json({ error: 'Not found' });

  const actorOk = admin || row.buyer_id === user.id || row.seller_id === user.id;
  if (!actorOk) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (toStatus === 'refunded' && !admin) {
    return res.status(403).json({ error: 'Admin only' });
  }

  try {
    const { result } = await ensureIdempotentMutation<IdempotentHttpPayload>(
      supabase,
      'transition_tx',
      idempotencyKey,
      async () => {
        const r = await applyTransactionTransition(supabase, {
          transactionId,
          toStatus,
          trigger: admin ? 'admin' : 'api',
          isAdmin: admin,
          actorUserId: user.id,
          deliveryConfirmed,
          shipmentPatch: body.shipment ?? undefined,
          deliverySignatureProof: (body.delivery_signature_proof as string | undefined) ?? null,
        });
        if (!r.ok) {
          return { status: r.status, body: { error: r.error } };
        }
        return {
          status: 200,
          body: { success: true, transaction: r.transaction, ...(r.ignored ? { ignored: true } : {}) },
        };
      }
    );
    return res.status(result.status).json(result.body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Idempotency error';
    return res.status(500).json({ error: msg });
  }
}
