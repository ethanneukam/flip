import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const API_SECRET = process.env.API_SECRET;
const VERCEL_API_URL = process.env.VERCEL_API_URL || 'http://localhost:3000';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { scope = 'watchlisted', limit = 500 } = req.body;

  try {
    let flipItemIds: string[] = [];

    if (scope === 'watchlisted') {
      const { data: watchlistEntries, error } = await supabase
        .from('watchlist_items')
        .select('flip_item_id')
        .limit(limit);

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch watchlist', detail: error.message });
      }

      flipItemIds = Array.from(new Set((watchlistEntries || []).map(w => w.flip_item_id)));
    } else if (scope === 'expired') {
      const { data: expiredSignals, error } = await supabase
        .from('market_signals')
        .select('flip_item_id')
        .lt('expires_at', new Date().toISOString())
        .limit(limit);

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch expired signals', detail: error.message });
      }

      flipItemIds = (expiredSignals || []).map(s => s.flip_item_id);
    }

    if (flipItemIds.length === 0) {
      return res.status(200).json({ success: true, processed: 0, message: 'No items to recompute' });
    }

    let succeeded = 0;
    let failed = 0;

    for (const flipItemId of flipItemIds) {
      try {
        const response = await fetch(`${VERCEL_API_URL}/api/compute-market-signal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_SECRET}`,
          },
          body: JSON.stringify({ flipItemId }),
        });

        if (response.ok) {
          succeeded++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return res.status(200).json({
      success: true,
      processed: flipItemIds.length,
      succeeded,
      failed,
    });

  } catch (err: any) {
    console.error('batch-recompute-signals error:', err);
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
