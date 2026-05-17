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

  const { flipItemId } = req.body;

  if (!flipItemId) {
    return res.status(400).json({ error: 'Missing required field: flipItemId' });
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

    const { data: existing } = await supabase
      .from('watchlist_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('flip_item_id', flipItemId)
      .single();

    if (existing) {
      await supabase
        .from('watchlist_items')
        .delete()
        .eq('id', existing.id);

      return res.status(200).json({ success: true, action: 'removed', watched: false });
    }

    const { error: insertError } = await supabase
      .from('watchlist_items')
      .insert({
        user_id: user.id,
        flip_item_id: flipItemId,
      });

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(200).json({ success: true, action: 'already_watched', watched: true });
      }
      return res.status(500).json({ error: 'Failed to add to watchlist', detail: insertError.message });
    }

    return res.status(201).json({ success: true, action: 'added', watched: true });

  } catch (err: any) {
    console.error('toggle-watchlist error:', err);
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
