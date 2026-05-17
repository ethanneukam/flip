import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

  const body = req.body ?? {};
  const seller_id = body.seller_id as string | undefined;
  const flip_item_id = body.flip_item_id as string | undefined;
  const amount = body.amount as number | string | undefined;
  const currency = (body.currency as string | undefined) ?? 'USD';
  const idempotency_key = body.idempotency_key as string | undefined;

  if (!seller_id || !flip_item_id || amount == null) {
    return res.status(400).json({ error: 'seller_id, flip_item_id, and amount are required' });
  }

  const amt = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  if (seller_id === user.id) {
    return res.status(400).json({ error: 'buyer cannot equal seller' });
  }

  const { data: item, error: itemErr } = await supabase
    .from('flip_items')
    .select('id, user_id')
    .eq('id', flip_item_id)
    .single();

  if (itemErr || !item) {
    return res.status(404).json({ error: 'flip_item not found' });
  }

  if (item.user_id !== seller_id) {
    return res.status(400).json({ error: 'seller_id does not own flip_item' });
  }

  const { data: seller, error: sellerErr } = await supabase.from('users').select('id').eq('id', seller_id).single();
  if (sellerErr || !seller) {
    return res.status(404).json({ error: 'seller not found' });
  }

  const insertRow = {
    buyer_id: user.id,
    seller_id,
    flip_item_id,
    amount: amt,
    currency,
    status: 'created',
    escrow_status: 'pending',
    shipment_status: 'not_shipped',
    payout_status: 'locked',
    idempotency_key: idempotency_key ?? null,
  };

  if (idempotency_key) {
    const { data: existing } = await supabase
      .from('transactions')
      .select('*')
      .eq('idempotency_key', idempotency_key)
      .maybeSingle();
    if (existing) {
      return res.status(200).json({ success: true, transaction: existing, idempotent: true });
    }
  }

  const { data: created, error: insErr } = await supabase
    .from('transactions')
    .insert(insertRow)
    .select('*')
    .single();

  if (insErr) {
    if (insErr.code === '23505' && idempotency_key) {
      const { data: existing } = await supabase
        .from('transactions')
        .select('*')
        .eq('idempotency_key', idempotency_key)
        .single();
      if (existing) {
        return res.status(200).json({ success: true, transaction: existing, idempotent: true });
      }
    }
    return res.status(500).json({ error: insErr.message });
  }

  return res.status(201).json({ success: true, transaction: created });
}
