import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role to bypass RLS for the hash write
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, keyName } = req.body;

  try {
    // 1. Generate a secure random string
    const buffer = crypto.randomBytes(24);
    const secret = buffer.toString('hex');
    const fullKey = `flip_live_${secret}`;
    
    // 2. Hash the key for storage
    const hash = crypto.createHash('sha256').update(fullKey).digest('hex');

    // 3. Store the hash and preview
    const { error } = await supabase.from('api_keys').insert({
      user_id: userId,
      name: keyName || 'Default Key',
      key_hash: hash,
      key_preview: `${fullKey.substring(0, 14)}...`
    });

    if (error) throw error;

    // 4. Return the RAW key once. It's gone after this!
    return res.status(200).json({ apiKey: fullKey });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}