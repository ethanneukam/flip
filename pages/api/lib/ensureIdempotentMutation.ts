import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Strong idempotency: same (scope, key) always returns the first successful JSON result.
 * Caller must make `handler` safe to skip if replay is detected externally (e.g. transition already applied).
 */
export async function ensureIdempotentMutation<T extends Record<string, unknown>>(
  client: SupabaseClient,
  scope: string,
  idempotencyKey: string,
  handler: () => Promise<T>
): Promise<{ replay: boolean; result: T }> {
  const key = (idempotencyKey ?? '').trim();
  if (!key) {
    throw new Error('idempotency_key required');
  }

  const { data: existing } = await client
    .from('transaction_idempotency')
    .select('response')
    .eq('scope', scope)
    .eq('idempotency_key', key)
    .maybeSingle();

  if (existing?.response) {
    return { replay: true, result: existing.response as T };
  }

  const result = await handler();

  const { error } = await client.from('transaction_idempotency').insert({
    scope,
    idempotency_key: key,
    response: result as unknown as Record<string, unknown>,
  });

  if (error?.code === '23505') {
    const { data: again } = await client
      .from('transaction_idempotency')
      .select('response')
      .eq('scope', scope)
      .eq('idempotency_key', key)
      .maybeSingle();
    if (again?.response) return { replay: true, result: again.response as T };
  }

  if (error) {
    throw new Error(error.message);
  }

  return { replay: false, result };
}
