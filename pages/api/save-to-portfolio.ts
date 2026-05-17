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
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const { flipItemId, costBasis } = req.body;

  if (!flipItemId) {
    return res.status(400).json({ error: 'Missing required field: flipItemId' });
  }

  if (costBasis !== undefined && (typeof costBasis !== 'number' || costBasis < 0)) {
    return res.status(400).json({ error: 'costBasis must be a non-negative number' });
  }

  try {
    const { data: item, error: itemError } = await supabase
      .from('flip_items')
      .select('id')
      .eq('id', flipItemId)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ error: 'FlipItem not found' });
    }

    const { data: signal } = await supabase
      .from('market_signals')
      .select('recommended_price')
      .eq('flip_item_id', flipItemId)
      .single();

    const estimatedValue = signal ? Number(signal.recommended_price) : 0;
    const effectiveCostBasis = costBasis ?? estimatedValue;

    const { data: existing } = await supabase
      .from('portfolio_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('flip_item_id', flipItemId)
      .single();

    if (existing) {
      return res.status(200).json({ success: true, portfolioId: existing.id, action: 'already_exists' });
    }

    const { data: entry, error: insertError } = await supabase
      .from('portfolio_entries')
      .insert({
        user_id: user.id,
        flip_item_id: flipItemId,
        cost_basis: effectiveCostBasis,
        estimated_value: estimatedValue,
        status: 'holding',
      })
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(200).json({ success: true, action: 'already_exists' });
      }
      return res.status(500).json({ error: 'Failed to save to portfolio', detail: insertError.message });
    }

    return res.status(201).json({ success: true, portfolioId: entry.id, action: 'created' });

  } catch (err: any) {
    console.error('save-to-portfolio error:', err);
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
