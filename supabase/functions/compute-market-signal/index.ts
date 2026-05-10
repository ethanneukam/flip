import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const VERCEL_API_URL = Deno.env.get('VERCEL_API_URL');
const API_SECRET = Deno.env.get('API_SECRET');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}
if (!VERCEL_API_URL || !API_SECRET) {
  throw new Error('Missing required env: VERCEL_API_URL, API_SECRET');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const MAX_RETRY_ATTEMPTS = 5;
const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes — entries older than this are eligible for retry
const BATCH_SIZE = 20;

serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();

    // Fetch pending retry queue entries older than 2 minutes (gives initial trigger time to succeed)
    const { data: retryItems, error: fetchError } = await supabase
      .from('signal_retry_queue')
      .select('id, flip_item_id, attempts')
      .eq('status', 'pending')
      .lt('created_at', staleThreshold)
      .lt('attempts', MAX_RETRY_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch retry queue', detail: fetchError.message }),
        { status: 500 }
      );
    }

    if (!retryItems || retryItems.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), { status: 200 });
    }

    let succeeded = 0;
    let failed = 0;
    let permanentlyFailed = 0;

    for (const item of retryItems) {
      // Mark as processing to prevent duplicate pickup
      await supabase
        .from('signal_retry_queue')
        .update({ status: 'processing', last_attempt_at: new Date().toISOString() })
        .eq('id', item.id);

      try {
        const response = await fetch(`${VERCEL_API_URL}/api/compute-market-signal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_SECRET}`,
          },
          body: JSON.stringify({ flipItemId: item.flip_item_id }),
        });

        if (response.ok) {
          // Success — the compute-market-signal route itself deletes the queue entry,
          // but we also delete here as a safety measure
          await supabase
            .from('signal_retry_queue')
            .delete()
            .eq('id', item.id);
          succeeded++;
        } else {
          const errorText = await response.text().catch(() => 'unknown');
          const newAttempts = item.attempts + 1;

          if (newAttempts >= MAX_RETRY_ATTEMPTS) {
            await supabase
              .from('signal_retry_queue')
              .update({
                status: 'failed',
                attempts: newAttempts,
                last_error: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
                last_attempt_at: new Date().toISOString(),
              })
              .eq('id', item.id);
            permanentlyFailed++;
          } else {
            await supabase
              .from('signal_retry_queue')
              .update({
                status: 'pending',
                attempts: newAttempts,
                last_error: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
                last_attempt_at: new Date().toISOString(),
              })
              .eq('id', item.id);
            failed++;
          }
        }
      } catch (err) {
        const newAttempts = item.attempts + 1;
        const errorMsg = err instanceof Error ? err.message : String(err);

        if (newAttempts >= MAX_RETRY_ATTEMPTS) {
          await supabase
            .from('signal_retry_queue')
            .update({
              status: 'failed',
              attempts: newAttempts,
              last_error: errorMsg.slice(0, 200),
              last_attempt_at: new Date().toISOString(),
            })
            .eq('id', item.id);
          permanentlyFailed++;
        } else {
          await supabase
            .from('signal_retry_queue')
            .update({
              status: 'pending',
              attempts: newAttempts,
              last_error: errorMsg.slice(0, 200),
              last_attempt_at: new Date().toISOString(),
            })
            .eq('id', item.id);
          failed++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: retryItems.length,
        succeeded,
        failed,
        permanentlyFailed,
      }),
      { status: 200 }
    );

  } catch (err) {
    console.error('compute-market-signal retry error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', detail: String(err) }),
      { status: 500 }
    );
  }
});
