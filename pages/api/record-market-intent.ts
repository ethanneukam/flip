import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const INTENT_TYPES = ['buy', 'save', 'skip', 'inspect_seller'] as const;
type IntentType = (typeof INTENT_TYPES)[number];

function isIntentType(v: unknown): v is IntentType {
  return typeof v === 'string' && (INTENT_TYPES as readonly string[]).includes(v);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }

  const { flip_item_id, intent_type } = req.body ?? {};

  if (!flip_item_id || typeof flip_item_id !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing required field: flip_item_id' });
  }

  if (!isIntentType(intent_type)) {
    return res.status(400).json({ success: false, error: 'Invalid intent_type' });
  }

  try {
    const { data: item, error: itemError } = await supabase
      .from('flip_items')
      .select('id')
      .eq('id', flip_item_id)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ success: false, error: 'FlipItem not found' });
    }

    const { error: insertError } = await supabase.from('market_intents').insert({
      user_id: user.id,
      flip_item_id,
      intent_type,
    });

    if (insertError) {
      console.error('record-market-intent insert:', insertError);
      return res.status(500).json({ success: false, error: insertError.message });
    }

    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('record-market-intent error:', err);
    return res.status(500).json({ success: false, error: message });
  }
}
