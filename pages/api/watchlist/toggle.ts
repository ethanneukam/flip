import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, itemId } = req.body;

  try {
    // 1. Check if it's already pinned
    const { data: existing } = await supabase
      .from('user_watchlist')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .single();

    if (existing) {
      // 2. If exists, DELETE it (Unpin)
      await supabase.from('user_watchlist').delete().eq('id', existing.id);
      return res.status(200).json({ status: 'removed' });
    } else {
      // 3. If not, INSERT it (Pin)
      await supabase.from('user_watchlist').insert({ user_id: userId, item_id: itemId });
      return res.status(200).json({ status: 'added' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}