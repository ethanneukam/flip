import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const MOVEMENT_THRESHOLD = 0.03;

type PredictionRow = {
  id: string;
  user_id: string;
  flip_item_id: string;
  prediction_type: string;
  entry_price: number;
  status: string;
};

function resolvePrediction(
  predictionType: string,
  entryPrice: number,
  currentAvgPrice: number
): { outcome: 'correct' | 'incorrect' | 'inconclusive'; accuracy_delta: number } {
  const priceMovement = (currentAvgPrice - entryPrice) / entryPrice;

  if (Math.abs(priceMovement) < MOVEMENT_THRESHOLD) {
    return { outcome: 'inconclusive', accuracy_delta: 0 };
  }

  const priceWentUp = priceMovement > 0;
  const correct =
    (predictionType === 'price_up' && priceWentUp) ||
    (predictionType === 'price_down' && !priceWentUp) ||
    (predictionType === 'undervalued' && priceWentUp) ||
    (predictionType === 'overvalued' && !priceWentUp);

  const magnitude = Math.min(Math.abs(priceMovement), 0.5);
  const accuracy_delta = correct
    ? parseFloat((magnitude * 0.2).toFixed(4))
    : parseFloat((-magnitude * 0.1).toFixed(4));

  return { outcome: correct ? 'correct' : 'incorrect', accuracy_delta };
}

serve(async (req: Request) => {
  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Fetch all pending predictions that have reached their resolution time
    const { data: predictions, error: fetchError } = await supabase
      .from('predictions')
      .select('id, user_id, flip_item_id, prediction_type, entry_price, status')
      .eq('status', 'pending')
      .lte('resolves_at', new Date().toISOString())
      .limit(200);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch predictions', detail: fetchError.message }),
        { status: 500 }
      );
    }

    if (!predictions || predictions.length === 0) {
      return new Response(JSON.stringify({ success: true, resolved: 0 }), { status: 200 });
    }

    // Get unique flip_item_ids to batch-fetch current market signals
    const flipItemIds = Array.from(new Set(predictions.map((p: PredictionRow) => p.flip_item_id)));

    const { data: signals, error: signalError } = await supabase
      .from('market_signals')
      .select('flip_item_id, avg_price')
      .in('flip_item_id', flipItemIds);

    if (signalError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch market signals', detail: signalError.message }),
        { status: 500 }
      );
    }

    // Build lookup map: flip_item_id → current avg_price
    const signalMap = new Map<string, number>();
    if (signals) {
      for (const s of signals) {
        signalMap.set(s.flip_item_id, Number(s.avg_price));
      }
    }

    let resolved = 0;
    let expired = 0;
    let skipped = 0;

    for (const prediction of predictions as PredictionRow[]) {
      const currentAvgPrice = signalMap.get(prediction.flip_item_id);

      if (currentAvgPrice === undefined) {
        // No market signal exists — mark as expired (cannot resolve without price data)
        await supabase
          .from('predictions')
          .update({
            status: 'expired',
            resolved_at: new Date().toISOString(),
          })
          .eq('id', prediction.id);
        expired++;
        continue;
      }

      const { outcome, accuracy_delta } = resolvePrediction(
        prediction.prediction_type,
        Number(prediction.entry_price),
        currentAvgPrice
      );

      const { error: updateError } = await supabase
        .from('predictions')
        .update({
          status: 'resolved',
          resolved_price: currentAvgPrice,
          outcome,
          accuracy_delta,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', prediction.id);

      if (updateError) {
        skipped++;
        continue;
      }

      resolved++;
    }

    return new Response(
      JSON.stringify({ success: true, resolved, expired, skipped, total: predictions.length }),
      { status: 200 }
    );

  } catch (err) {
    console.error('resolve-predictions error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', detail: String(err) }),
      { status: 500 }
    );
  }
});
