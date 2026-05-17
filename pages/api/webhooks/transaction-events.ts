/**
 * Idempotent provider ingress for Flip transactions (Stripe / Shippo / EasyPost).
 * Verifies HMAC, dedupes by event_id + deterministic event_hash, applies transitions via the same engine as the API.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import {
  applyTransactionTransition,
  type FlipTransactionStatus,
} from '../transition-transaction';
import {
  computeDeterministicWebhookEventHash,
  assertWebhookProviderMatch,
} from '../../flip-mobile/lib/transactionStateMachine';
import { logTransactionAudit } from '../../flip-mobile/lib/transactionAuditLog';
import { ensureIdempotentMutation } from '../lib/ensureIdempotentMutation';

export const config = { api: { bodyParser: false } };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_SECRET = process.env.TRANSACTION_WEBHOOK_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function verifySignature(rawBody: string, header: string | undefined): boolean {
  if (!WEBHOOK_SECRET || !header) return false;
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  const normalized = header.startsWith('sha256=') ? header.slice(7) : header;
  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(normalized, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type WebhookBody = {
  event_id?: string;
  type?: string;
  transaction_id?: string;
  /** EasyPost / carrier mirror — maps to shipped vs in_transit vs delivered. */
  tracker_status?: string;
  delivery_signature_proof?: string | null;
  shipment?: {
    shipping_provider?: string;
    tracking_number?: string;
    label_url?: string;
    delivery_signature_received?: string | null;
  };
};

type WebhookIdemResult = { status: number; body: Record<string, unknown> };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!WEBHOOK_SECRET) {
    return res.status(500).json({ error: 'TRANSACTION_WEBHOOK_SECRET not configured' });
  }

  const rawBuf = await buffer(req);
  const raw = rawBuf.toString('utf8');
  const sig = req.headers['x-flip-signature'] as string | undefined;

  if (!verifySignature(raw, sig)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(raw) as WebhookBody;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const eventId = body.event_id;
  const transactionId = body.transaction_id;
  const type = body.type;

  if (!transactionId || !type) {
    return res.status(400).json({ error: 'transaction_id and type required' });
  }

  if (!eventId) {
    return res.status(400).json({ error: 'event_id required for deduplication' });
  }

  const providerHdr = req.headers['x-webhook-provider'] as string | undefined;
  const prov = assertWebhookProviderMatch(providerHdr, type);
  if (!prov.ok) {
    return res.status(400).json({ error: prov.error });
  }

  const eventHash = computeDeterministicWebhookEventHash({
    transaction_id: transactionId,
    type,
    tracker_status: body.tracker_status,
    shipment: body.shipment,
  });

  const idempotencyKey = `${prov.provider}:${eventId}:${eventHash}`;

  let toStatus: FlipTransactionStatus | null = null;
  switch (type) {
    case 'stripe.payment_intent.succeeded':
    case 'payment.escrowed':
      toStatus = 'escrowed';
      break;
    case 'fulfillment.awaiting_shipment':
    case 'seller.ready_to_ship':
      toStatus = 'awaiting_shipment';
      break;
    case 'carrier.shipped':
    case 'shippo.transaction.created':
      toStatus = 'shipped';
      break;
    case 'easypost.tracker.updated': {
      const ts = (body.tracker_status ?? '').toLowerCase();
      if (ts.includes('in_transit') || ts.includes('in transit')) {
        toStatus = 'in_transit';
      } else if (ts.includes('deliver') || ts.includes('pickup')) {
        toStatus = 'delivered';
      } else {
        toStatus = 'shipped';
      }
      break;
    }
    case 'carrier.in_transit':
      toStatus = 'in_transit';
      break;
    case 'carrier.delivered':
    case 'delivery.confirmed':
      toStatus = 'delivered';
      break;
    default:
      return res.status(200).json({ success: true, ignored: true, type });
  }

  const webhookDelivered =
    type === 'delivery.confirmed' ||
    type === 'carrier.delivered' ||
    (type === 'easypost.tracker.updated' && toStatus === 'delivered');
  const carrierConfirmedIncoming =
    type === 'carrier.delivered' ||
    type === 'delivery.confirmed' ||
    (type === 'easypost.tracker.updated' && toStatus === 'delivered');

  try {
    const { result } = await ensureIdempotentMutation<WebhookIdemResult>(
      supabase,
      'webhook_ingress',
      idempotencyKey,
      async () => {
        const applyRes = await applyTransactionTransition(supabase, {
          transactionId,
          toStatus,
          trigger: 'webhook',
          eventId,
          incomingEventHash: eventHash,
          isAdmin: false,
          shipmentPatch: body.shipment,
          deliveryConfirmed: type === 'delivery.confirmed' || type === 'carrier.delivered',
          webhookDelivered,
          carrierConfirmedIncoming,
          deliverySignatureProof: body.delivery_signature_proof ?? null,
        });

        if (!applyRes.ok) {
          await logTransactionAudit(supabase, {
            transactionId,
            category: 'webhook_ingest',
            message: `${type}_failed`,
            payload: { event_id: eventId, event_hash: eventHash, error: applyRes.error },
          });
          return { status: applyRes.status, body: { error: applyRes.error } };
        }
        if (!applyRes.ignored && !applyRes.buffered) {
          await logTransactionAudit(supabase, {
            transactionId,
            category: 'webhook_ingest',
            message: type,
            payload: { event_id: eventId, event_hash: eventHash, to_status: toStatus },
          });
        }
        if (applyRes.ignored) {
          return { status: 200, body: { success: true, ignored: true, transaction: applyRes.transaction } };
        }
        if (applyRes.buffered) {
          return { status: 200, body: { success: true, buffered: true, transaction: applyRes.transaction } };
        }
        return { status: 200, body: { success: true, transaction: applyRes.transaction } };
      }
    );

    return res.status(result.status).json(result.body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Webhook idempotency error';
    return res.status(500).json({ error: msg });
  }
}
