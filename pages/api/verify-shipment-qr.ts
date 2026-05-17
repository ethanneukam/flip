import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import {
  type QrPayloadV2,
  verifyQrSignature,
} from '../../flip-mobile/lib/transactionStateMachine';
import { logTransactionAudit } from '../../flip-mobile/lib/transactionAuditLog';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SHIPMENT_QR_SECRET = process.env.FLIP_SHIPMENT_QR_SECRET ?? process.env.TRANSACTION_WEBHOOK_SECRET ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ALLOWED_SCAN_STATUSES = new Set(['awaiting_shipment', 'shipped', 'in_transit']);

function parsePayload(body: Record<string, unknown>): { payload: QrPayloadV2; signature: string } | null {
  let raw: unknown = body.qr ?? body;
  if (typeof raw === 'string') {
    try {
      const decoded = Buffer.from(raw, 'base64url').toString('utf8');
      raw = JSON.parse(decoded) as unknown;
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const signature = o.signature;
  if (typeof signature !== 'string') return null;
  const { signature: _s, ...rest } = o;
  const p = rest as QrPayloadV2;
  if (p.v !== 2) return null;
  if (typeof p.transaction_id !== 'string' || typeof p.shipment_id !== 'string') return null;
  if (typeof p.nonce !== 'string' || typeof p.expires_at !== 'string') return null;
  return { payload: p, signature };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SHIPMENT_QR_SECRET) {
    return res.status(500).json({ error: 'FLIP_SHIPMENT_QR_SECRET not configured' });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const parsed = parsePayload(body);
  if (!parsed) {
    return res.status(400).json({ error: 'Invalid QR payload' });
  }

  const { payload, signature } = parsed;

  if (!verifyQrSignature(SHIPMENT_QR_SECRET, payload, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const exp = Date.parse(payload.expires_at);
  if (!Number.isFinite(exp) || Date.now() > exp) {
    return res.status(400).json({ error: 'QR expired' });
  }

  const { data: row, error } = await supabase
    .from('transactions')
    .select('id, status, shipment_id, qr_nonce, qr_signature')
    .eq('id', payload.transaction_id)
    .maybeSingle();

  if (error || !row) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  if (String(row.shipment_id) !== payload.shipment_id) {
    return res.status(400).json({ error: 'shipment_id mismatch' });
  }

  if (row.qr_nonce && payload.nonce !== row.qr_nonce) {
    return res.status(400).json({ error: 'nonce mismatch' });
  }

  if (row.qr_signature && signature !== row.qr_signature) {
    return res.status(400).json({ error: 'signature revoked' });
  }

  if (!ALLOWED_SCAN_STATUSES.has(row.status as string)) {
    return res.status(409).json({ error: 'transaction not in valid shipping state for QR' });
  }

  await supabase.from('transaction_qr_scans').insert({
    transaction_id: row.id,
    payload: {
      shipment_id: payload.shipment_id,
      nonce: payload.nonce,
      scanned_at: new Date().toISOString(),
      client_ip: (req.headers['x-forwarded-for'] as string) ?? req.socket?.remoteAddress ?? null,
    },
  });

  await logTransactionAudit(supabase, {
    transactionId: row.id,
    category: 'qr_scan',
    message: 'verify-shipment-qr',
    payload: { shipment_id: payload.shipment_id },
  });

  return res.status(200).json({ success: true, transaction_id: row.id, shipment_id: payload.shipment_id });
}
