import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function verifyApiKey(key: string) {
  if (!key.startsWith('flip_live_')) return null;

  // Hash the incoming key to compare with our stored hash
  const hash = crypto.createHash('sha256').update(key).digest('hex');

  const { data, error } = await supabase
    .from('api_keys')
    .select('user_id, usage_count')
    .eq('key_hash', hash)
    .single();

  if (error || !data) return null;

  // Optional: Increment usage count here
  return data.user_id;
}