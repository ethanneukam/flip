import type { SupabaseClient } from '@supabase/supabase-js';

const POLL_INTERVAL_MS = 50;
const POLL_MAX = 100; // 5s total wait for peer to finalize
/** If a NULL-response claim is older than this, another worker may delete and reclaim (crash recovery). */
const STALE_CLAIM_MS = 90_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Strong idempotency: same (scope, key) always returns the first successful JSON result.
 * Uses a claim row (response NULL) so two concurrent requests cannot both execute `handler`.
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

  const { error: insErr } = await client.from('transaction_idempotency').insert({
    scope,
    idempotency_key: key,
    response: null,
    claimed_at: new Date().toISOString(),
  });

  if (!insErr) {
    try {
      const result = await handler();
      const { error: upErr } = await client
        .from('transaction_idempotency')
        .update({ response: result as unknown as Record<string, unknown> })
        .eq('scope', scope)
        .eq('idempotency_key', key)
        .is('response', null);
      if (upErr) {
        throw new Error(upErr.message);
      }
      return { replay: false, result };
    } catch (e) {
      await client.from('transaction_idempotency').delete().eq('scope', scope).eq('idempotency_key', key);
      throw e;
    }
  }

  if (insErr.code !== '23505') {
    throw new Error(insErr.message);
  }

  let reclaimed = false;
  for (let i = 0; i < POLL_MAX; i++) {
    const { data: row } = await client
      .from('transaction_idempotency')
      .select('response, claimed_at')
      .eq('scope', scope)
      .eq('idempotency_key', key)
      .maybeSingle();

    if (row?.response != null) {
      return { replay: true, result: row.response as T };
    }

    if (row && row.response == null && row.claimed_at && !reclaimed) {
      const age = Date.now() - Date.parse(row.claimed_at as string);
      if (age > STALE_CLAIM_MS && i > 10) {
        await client
          .from('transaction_idempotency')
          .delete()
          .eq('scope', scope)
          .eq('idempotency_key', key)
          .is('response', null);
        const retry = await client.from('transaction_idempotency').insert({
          scope,
          idempotency_key: key,
          response: null,
          claimed_at: new Date().toISOString(),
        });
        if (!retry.error) {
          reclaimed = true;
          try {
            const result = await handler();
            const { error: upErr } = await client
              .from('transaction_idempotency')
              .update({ response: result as unknown as Record<string, unknown> })
              .eq('scope', scope)
              .eq('idempotency_key', key)
              .is('response', null);
            if (upErr) throw new Error(upErr.message);
            return { replay: false, result };
          } catch (e) {
            await client.from('transaction_idempotency').delete().eq('scope', scope).eq('idempotency_key', key);
            throw e;
          }
        }
        if (retry.error.code !== '23505') {
          throw new Error(retry.error.message);
        }
        reclaimed = true;
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }

  const { data: last } = await client
    .from('transaction_idempotency')
    .select('response')
    .eq('scope', scope)
    .eq('idempotency_key', key)
    .maybeSingle();
  if (last?.response != null) {
    return { replay: true, result: last.response as T };
  }
  throw new Error('idempotency_wait_timeout');
}
