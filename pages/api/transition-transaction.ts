import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FLIP_ADMIN_SECRET = process.env.FLIP_ADMIN_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export type FlipTransactionStatus =
  | 'created'
  | 'escrowed'
  | 'awaiting_shipment'
  | 'shipped'
  | 'in_transit'
  | 'delivered'
  | 'completed'
  | 'disputed'
  | 'refunded';

export type TransitionTrigger = 'api' | 'webhook' | 'admin' | 'system';

const NORMAL_EDGES: Record<string, string[]> = {
  created: ['escrowed', 'disputed'],
  escrowed: ['awaiting_shipment', 'disputed'],
  awaiting_shipment: ['shipped', 'disputed'],
  shipped: ['in_transit', 'disputed'],
  in_transit: ['delivered', 'disputed'],
  delivered: ['completed', 'disputed'],
  completed: [],
  disputed: ['refunded'],
  refunded: [],
};

export function isAdminRequest(req: NextApiRequest): boolean {
  const h = req.headers['x-flip-admin-secret'];
  return typeof h === 'string' && !!FLIP_ADMIN_SECRET && h === FLIP_ADMIN_SECRET;
}

export function canFlipTransition(from: string, to: string, ctx: { isAdmin: boolean }): boolean {
  if (to === 'disputed') return from !== 'refunded';
  if (from === 'disputed' && to === 'refunded') return ctx.isAdmin;
  return (NORMAL_EDGES[from] ?? []).includes(to);
}

function hashEvent(parts: (string | null | undefined)[]): string {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

export function generateQrPayload(transactionId: string): string {
  const token = crypto.randomBytes(24).toString('base64url');
  const payload = { v: 1, transaction_id: transactionId, t: token };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function auxiliaryForStatus(status: FlipTransactionStatus): {
  escrow_status: string;
  shipment_status: string;
  payout_status: string;
} {
  if (status === 'created') {
    return { escrow_status: 'pending', shipment_status: 'not_shipped', payout_status: 'locked' };
  }
  if (status === 'completed') {
    return { escrow_status: 'released', shipment_status: 'delivered', payout_status: 'releasable' };
  }
  if (status === 'disputed' || status === 'refunded') {
    return { escrow_status: 'refunded_hold', shipment_status: 'not_shipped', payout_status: 'blocked' };
  }
  let shipment_status = 'not_shipped';
  if (status === 'shipped') shipment_status = 'shipped';
  else if (status === 'in_transit') shipment_status = 'in_transit';
  else if (status === 'delivered') shipment_status = 'delivered';
  return { escrow_status: 'locked', shipment_status, payout_status: 'locked' };
}

/**
 * Stripe Connect payout release is ONLY structured here — escrow must not release
 * before status === completed AND delivery_confirmed (validated before this runs).
 */
async function finalizePayoutIfEligible(
  client: SupabaseClient,
  row: { id: string; delivery_confirmed: boolean; status: string }
): Promise<void> {
  if (row.status !== 'completed' || !row.delivery_confirmed) return;
  if (!process.env.STRIPE_SECRET_KEY) {
    console.info('[PAYOUT_ELIGIBLE_NO_STRIPE]', row.id);
  } else {
    console.info('[PAYOUT_ELIGIBLE_CONNECT]', row.id);
  }
  await client
    .from('transactions')
    .update({
      payout_status: 'released',
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id);
}

export type ApplyTransitionOpts = {
  transactionId: string;
  toStatus: FlipTransactionStatus;
  trigger: TransitionTrigger;
  eventId?: string | null;
  isAdmin?: boolean;
  actorUserId?: string | null;
  deliveryConfirmed?: boolean;
  shipmentPatch?: Partial<{
    shipping_provider: string;
    tracking_number: string;
    label_url: string;
  }>;
};

export async function applyTransactionTransition(
  client: SupabaseClient,
  opts: ApplyTransitionOpts
): Promise<{ ok: true; transaction: Record<string, unknown> } | { ok: false; error: string; status: number }> {
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

  if (opts.eventId) {
    const { data: dup } = await client
      .from('transaction_events')
      .select('id')
      .eq('event_id', opts.eventId)
      .maybeSingle();
    if (dup) {
      const { data: latest } = await client.from('transactions').select('*').eq('id', opts.transactionId).single();
      return { ok: true, transaction: (latest ?? row) as Record<string, unknown> };
    }
  }

  if (!canFlipTransition(from, to, { isAdmin: admin })) {
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

  const aux = auxiliaryForStatus(to);
  const now = new Date().toISOString();
  const eventHash = hashEvent([
    row.last_event_hash ?? '',
    row.id,
    from,
    to,
    now,
    opts.eventId ?? '',
    opts.trigger,
  ]);

  const patch: Record<string, unknown> = {
    status: to,
    escrow_status: aux.escrow_status,
    shipment_status: aux.shipment_status,
    payout_status: aux.payout_status,
    updated_at: now,
    last_event_hash: eventHash,
  };

  if (opts.shipmentPatch?.shipping_provider) {
    patch.shipping_provider = opts.shipmentPatch.shipping_provider;
  }
  if (opts.shipmentPatch?.tracking_number) {
    patch.tracking_number = opts.shipmentPatch.tracking_number;
    patch.shipment_status = 'shipped';
  }
  if (opts.shipmentPatch?.label_url) {
    patch.label_url = opts.shipmentPatch.label_url;
  }

  if (to === 'awaiting_shipment' && !row.qr_code) {
    patch.qr_code = generateQrPayload(row.id as string);
  }

  if (opts.deliveryConfirmed === true) {
    patch.delivery_confirmed = true;
  }
  if (to === 'delivered') {
    patch.delivery_confirmed = true;
    patch.shipment_status = 'delivered';
  }

  if (to === 'shipped') patch.shipment_status = 'shipped';
  if (to === 'in_transit') patch.shipment_status = 'in_transit';

  const { error: evInsErr } = await client.from('transaction_events').insert({
    transaction_id: row.id,
    previous_state: from,
    new_state: to,
    trigger_source: opts.trigger,
    event_id: opts.eventId ?? null,
    payload: { shipmentPatch: opts.shipmentPatch ?? null, actor: opts.actorUserId ?? null },
    event_hash: eventHash,
  });

  if (evInsErr) {
    if (evInsErr.code === '23505' && opts.eventId) {
      const { data: latest } = await client.from('transactions').select('*').eq('id', opts.transactionId).single();
      return { ok: true, transaction: (latest ?? row) as Record<string, unknown> };
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

  if (to === 'completed' && updated.delivery_confirmed) {
    await finalizePayoutIfEligible(client, updated as { id: string; delivery_confirmed: boolean; status: string });
    const { data: finalRow } = await client.from('transactions').select('*').eq('id', row.id).single();
    return { ok: true, transaction: (finalRow ?? updated) as Record<string, unknown> };
  }

  return { ok: true, transaction: updated as Record<string, unknown> };
}

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

  if (!transactionId || !toStatus) {
    return res.status(400).json({ error: 'transaction_id and to_status required' });
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

  const result = await applyTransactionTransition(supabase, {
    transactionId,
    toStatus,
    trigger: admin ? 'admin' : 'api',
    isAdmin: admin,
    actorUserId: user.id,
    deliveryConfirmed,
    shipmentPatch: body.shipment ?? undefined,
  });

  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }

  return res.status(200).json({ success: true, transaction: result.transaction });
}
