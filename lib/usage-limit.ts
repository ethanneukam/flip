import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function validateAndIncrementUsage(apiKey: string) {
  // 1. Find the key and the owner's tier
  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select('*, profiles(tier, request_count)')
    .eq('key_value', apiKey)
    .single();

  if (error || !keyData) throw new Error("INVALID_API_KEY");

  const { tier, request_count } = keyData.profiles;

  // 2. Enforcement Logic (Optional: Hard cap for Free users)
  if (tier === 'free' && request_count >= 100) {
    throw new Error("FREE_TIER_EXCEEDED");
  }

  // 3. Increment the count in Supabase
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ request_count: request_count + 1 })
    .eq('id', keyData.user_id);

  if (updateError) throw new Error("USAGE_TRACKING_FAILED");

  return true;
}