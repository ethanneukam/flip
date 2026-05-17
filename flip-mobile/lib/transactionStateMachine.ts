/**
 * Phase 13.2 — formal transaction + carrier + escrow + payout rules (backend authority).
 * All API/webhook paths must consult this module before mutating `transactions`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/** Canonical Flip transaction lifecycle (matches DB CHECK). */
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

export type CarrierShipmentState = 'CREATED' | 'LABEL_CREATED' | 'IN_TRANSIT' | 'DELIVERED';

export type EscrowState = 'pending' | 'locked' | 'release_eligible' | 'released' | 'refunded_hold';

export const MAIN_LIFECYCLE_ORDER: readonly string[] = [
  'created',
  'escrowed',
  'awaiting_shipment',
  'shipped',
  'in_transit',
  'delivered',
  'completed',
] as const;

/** Forward-skipping carrier/webhook events that cannot apply yet → buffer instead of 409. */
export function shouldBufferDisconnectedForward(from: string, to: string, isAdmin: boolean): boolean {
  if (isAdmin) return false;
  if (['completed', 'refunded'].includes(from)) return false;
  if (to === 'disputed' || to === 'refunded') return false;
  const i = MAIN_LIFECYCLE_ORDER.indexOf(from);
  const j = MAIN_LIFECYCLE_ORDER.indexOf(to);
  if (i < 0 || j < 0) return false;
  if (j <= i) return false;
  return !canTransactionStatusTransition(from, to, false);
}

const STATUS_GRAPH: Record<string, readonly string[]> = {
  created: ['escrowed', 'disputed'],
  escrowed: ['awaiting_shipment', 'disputed'],
  awaiting_shipment: ['shipped', 'disputed'],
  shipped: ['in_transit', 'disputed'],
  in_transit: ['delivered', 'disputed'],
  delivered: ['completed', 'disputed'],
  completed: [],
  disputed: ['refunded'],
  refunded: [],
} as const;

const CARRIER_GRAPH: Record<CarrierShipmentState, readonly CarrierShipmentState[]> = {
  CREATED: ['LABEL_CREATED'],
  LABEL_CREATED: ['IN_TRANSIT'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: [],
};

export function canTransactionStatusTransition(from: string, to: string, isAdmin: boolean): boolean {
  if (to === 'disputed') return from !== 'refunded';
  if (from === 'disputed' && to === 'refunded') return isAdmin;
  return (STATUS_GRAPH[from] ?? []).includes(to);
}

export function canCarrierShipmentTransition(from: CarrierShipmentState, to: CarrierShipmentState): boolean {
  return (CARRIER_GRAPH[from] ?? []).includes(to);
}

/** Escrow is never `released` until payout eligibility passes (separate gate). */
export function escrowForTransactionStatus(status: FlipTransactionStatus): EscrowState {
  if (status === 'created') return 'pending';
  if (status === 'completed') return 'release_eligible';
  if (status === 'disputed' || status === 'refunded') return 'refunded_hold';
  return 'locked';
}

export function payoutForTransactionStatus(status: FlipTransactionStatus): string {
  if (status === 'completed') return 'releasable';
  if (status === 'disputed' || status === 'refunded') return 'blocked';
  return 'locked';
}

export function shipmentStatusForTransactionStatus(status: FlipTransactionStatus): string {
  if (status === 'shipped') return 'shipped';
  if (status === 'in_transit') return 'in_transit';
  if (status === 'delivered' || status === 'completed') return 'delivered';
  return 'not_shipped';
}

export function resolveCarrierAfterTransition(
  prev: CarrierShipmentState,
  nextStatus: FlipTransactionStatus,
  opts: { trackingNumberPresent: boolean; carrierConfirmed: boolean; webhookDelivered: boolean }
): CarrierShipmentState {
  if (nextStatus === 'delivered' || nextStatus === 'completed') {
    if (opts.webhookDelivered || opts.carrierConfirmed) return 'DELIVERED';
    return prev;
  }
  if (nextStatus === 'in_transit') {
    if (!opts.trackingNumberPresent) return prev;
    if (prev === 'LABEL_CREATED') return 'IN_TRANSIT';
    if (prev === 'CREATED') return 'LABEL_CREATED';
    return prev;
  }
  if (nextStatus === 'shipped' || nextStatus === 'awaiting_shipment') {
    if (opts.trackingNumberPresent && prev === 'CREATED') return 'LABEL_CREATED';
  }
  return prev;
}

export function buildQrForTransaction(params: {
  secret: string;
  transactionId: string;
  shipmentId: string;
  ttlMs: number;
}): { payload: QrPayloadV2; signature: string; nonce: string; expires_at: string } {
  const nonce = crypto.randomBytes(16).toString('base64url');
  const expires_at = new Date(Date.now() + params.ttlMs).toISOString();
  const payload: QrPayloadV2 = {
    v: 2,
    transaction_id: params.transactionId,
    shipment_id: params.shipmentId,
    nonce,
    expires_at,
  };
  const signature = signQrPayload(params.secret, payload);
  return { payload, signature, nonce, expires_at };
}

export const IMMUTABLE_TRANSACTION_KEYS = new Set([
  'amount',
  'buyer_id',
  'seller_id',
  'flip_item_id',
  'currency',
  'id',
  'created_at',
]);

export const ALLOWED_TRANSACTION_UPDATE_KEYS = new Set([
  'status',
  'escrow_status',
  'shipment_status',
  'payout_status',
  'shipping_provider',
  'tracking_number',
  'label_url',
  'qr_code',
  'qr_nonce',
  'qr_expires_at',
  'qr_signature',
  'delivery_confirmed',
  'carrier_shipment_state',
  'tracking_number_present',
  'carrier_confirmed',
  'delivery_signature_received',
  'last_event_hash',
  'updated_at',
]);

export function assertPatchImmutableSafe(patch: Record<string, unknown>): { ok: true } | { ok: false; error: string } {
  for (const k of Object.keys(patch)) {
    if (IMMUTABLE_TRANSACTION_KEYS.has(k)) {
      return { ok: false, error: `immutable field cannot be updated: ${k}` };
    }
    if (!ALLOWED_TRANSACTION_UPDATE_KEYS.has(k)) {
      return { ok: false, error: `field not allowed on transaction update: ${k}` };
    }
  }
  return { ok: true };
}

export type QrPayloadV2 = {
  v: 2;
  transaction_id: string;
  shipment_id: string;
  nonce: string;
  expires_at: string;
};

export function canonicalQrString(p: QrPayloadV2): string {
  return JSON.stringify({
    v: p.v,
    transaction_id: p.transaction_id,
    shipment_id: p.shipment_id,
    nonce: p.nonce,
    expires_at: p.expires_at,
  });
}

export function signQrPayload(secret: string, payload: QrPayloadV2): string {
  return crypto.createHmac('sha256', secret).update(canonicalQrString(payload)).digest('base64url');
}

export function verifyQrSignature(secret: string, payload: QrPayloadV2, signature: string): boolean {
  const expected = signQrPayload(secret, payload);
  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type ReleaseEligibilityResult = { ok: true } | { ok: false; reasons: string[] };

/**
 * Strict payout / escrow release gate (read-only on market_identity for fraud level).
 */
export async function releaseEligibilityCheck(
  client: SupabaseClient,
  tx: {
    id: string;
    status: string;
    delivery_confirmed: boolean;
    escrow_status: string;
    seller_id: string | null;
    inconsistent_state?: boolean;
    /** When true (admin + explicit payout override), allow proceeding despite inconsistent_state. */
    adminBypassConsistency?: boolean;
  }
): Promise<ReleaseEligibilityResult> {
  const reasons: string[] = [];
  if (tx.inconsistent_state && !tx.adminBypassConsistency) reasons.push('inconsistent_state');
  if (tx.status !== 'completed') reasons.push('status_not_completed');
  if (!tx.delivery_confirmed) reasons.push('delivery_not_confirmed');
  if (tx.status === 'disputed') reasons.push('active_dispute');
  if (tx.escrow_status !== 'release_eligible') reasons.push('escrow_not_release_eligible');

  if (tx.seller_id) {
    const { data: mi } = await client
      .from('market_identity')
      .select('fraud_risk_level')
      .eq('user_id', tx.seller_id)
      .maybeSingle();
    const level = (mi?.fraud_risk_level as string) ?? 'LOW';
    if (level === 'HIGH' || level === 'CRITICAL') reasons.push('seller_fraud_risk_block');
  }

  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

export type FinalPayoutCheckResult = { ok: true } | { ok: false; reasons: string[] };

/**
 * Final gate immediately before Stripe Connect (stub). No bypass unless admin override flag is set.
 * Requires internal escrow release timestamp (`escrow_released_at`) from the commit step.
 */
export async function finalPayoutCheck(
  client: SupabaseClient,
  tx: {
    id: string;
    status: string;
    delivery_confirmed: boolean;
    escrow_released_at: string | null;
    seller_id: string | null;
    inconsistent_state: boolean;
  },
  opts?: { adminPayoutOverride?: boolean; isAdmin?: boolean }
): Promise<FinalPayoutCheckResult> {
  if (opts?.adminPayoutOverride && opts?.isAdmin) {
    return { ok: true };
  }

  const reasons: string[] = [];
  if (tx.status !== 'completed') reasons.push('status_not_completed');
  if (!tx.delivery_confirmed) reasons.push('delivery_not_confirmed');
  if (!tx.escrow_released_at) reasons.push('escrow_released_at_missing');
  if (tx.inconsistent_state) reasons.push('inconsistent_state');

  if (tx.seller_id) {
    const { data: mi } = await client
      .from('market_identity')
      .select('fraud_risk_level')
      .eq('user_id', tx.seller_id)
      .maybeSingle();
    const level = (mi?.fraud_risk_level as string) ?? 'LOW';
    if (level === 'HIGH' || level === 'CRITICAL') reasons.push('seller_fraud_risk_block');
  }

  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

export function assertDeliveredAllowed(
  carrierState: CarrierShipmentState,
  carrierConfirmed: boolean,
  webhookDelivered: boolean,
  expectedSignature: string | null | undefined,
  providedSignature: string | null | undefined
): { ok: true } | { ok: false; error: string } {
  if (!(webhookDelivered || carrierConfirmed)) {
    if (carrierState === 'IN_TRANSIT' || carrierState === 'LABEL_CREATED') {
      return { ok: false, error: 'delivered requires carrier_confirmed or provider DELIVERED webhook' };
    }
    return { ok: false, error: 'invalid carrier state for delivered' };
  }
  if (expectedSignature != null && String(expectedSignature).length > 0) {
    if (providedSignature == null || String(providedSignature) !== String(expectedSignature)) {
      return { ok: false, error: 'delivery_signature_mismatch' };
    }
  }
  return { ok: true };
}

/** Stable hash for webhook dedupe (event_id + event_hash uniqueness in DB). */
export function computeDeterministicWebhookEventHash(input: {
  transaction_id: string;
  type: string;
  tracker_status?: string | null;
  shipment?: unknown;
}): string {
  const canonical = JSON.stringify({
    transaction_id: input.transaction_id,
    type: input.type,
    tracker_status: input.tracker_status ?? null,
    shipment: input.shipment ?? null,
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function assertWebhookProviderMatch(
  providerHeader: string | undefined,
  eventType: string
): { ok: true; provider: string } | { ok: false; error: string } {
  const raw = (providerHeader ?? '').trim().toLowerCase();
  if (!raw) return { ok: false, error: 'x-webhook-provider header required' };

  let expected: string;
  if (eventType.startsWith('stripe.')) expected = 'stripe';
  else if (eventType.startsWith('shippo.')) expected = 'shippo';
  else if (eventType.startsWith('easypost.')) expected = 'easypost';
  else expected = 'internal';

  if (raw !== expected) {
    return { ok: false, error: `provider mismatch: type ${eventType} expects ${expected}, got ${raw}` };
  }
  return { ok: true, provider: raw };
}
