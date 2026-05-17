import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const VALID_PREDICTION_TYPES = ['price_up', 'price_down', 'overvalued', 'undervalued'] as const;
const DEFAULT_HORIZON_DAYS = 30;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify user session via Supabase auth token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const { flipItemId, predictionType, entryPrice, targetPrice, horizonDays } = req.body;

  // Validate required fields
  if (!flipItemId || !predictionType || entryPrice === undefined) {
    return res.status(400).json({ error: 'Missing required fields: flipItemId, predictionType, entryPrice' });
  }

  if (!VALID_PREDICTION_TYPES.includes(predictionType)) {
    return res.status(400).json({ error: `Invalid predictionType. Must be one of: ${VALID_PREDICTION_TYPES.join(', ')}` });
  }

  if (typeof entryPrice !== 'number' || entryPrice <= 0) {
    return res.status(400).json({ error: 'entryPrice must be a positive number' });
  }

  const effectiveHorizon = horizonDays && Number.isInteger(horizonDays) && horizonDays > 0
    ? horizonDays
    : DEFAULT_HORIZON_DAYS;

  try {
    // Verify flip_item exists
    const { data: item, error: itemError } = await supabase
      .from('flip_items')
      .select('id')
      .eq('id', flipItemId)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ error: 'FlipItem not found' });
    }

    const resolvesAt = new Date(Date.now() + effectiveHorizon * 24 * 60 * 60 * 1000).toISOString();

    // Attempt INSERT with ON CONFLICT handling for the unique partial index
    // idx_predictions_unique_pending(user_id, flip_item_id) WHERE status='pending'
    // If a pending prediction already exists for this user+item, UPDATE it instead.
    const { data: result, error: upsertError } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: user.id,
          flip_item_id: flipItemId,
          prediction_type: predictionType,
          entry_price: entryPrice,
          target_price: targetPrice ?? null,
          horizon_days: effectiveHorizon,
          status: 'pending',
          resolves_at: resolvesAt,
        },
        {
          onConflict: 'user_id,flip_item_id',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single();

    if (upsertError) {
      // If upsert fails due to conflict on the partial index (race condition),
      // fall back to explicit update of the existing pending prediction
      if (upsertError.code === '23505') {
        const { data: existing } = await supabase
          .from('predictions')
          .select('id')
          .eq('user_id', user.id)
          .eq('flip_item_id', flipItemId)
          .eq('status', 'pending')
          .single();

        if (existing) {
          const { error: updateError } = await supabase
            .from('predictions')
            .update({
              prediction_type: predictionType,
              entry_price: entryPrice,
              target_price: targetPrice ?? null,
              horizon_days: effectiveHorizon,
              resolves_at: resolvesAt,
            })
            .eq('id', existing.id);

          if (updateError) {
            return res.status(500).json({ error: 'Failed to update prediction', detail: updateError.message });
          }

          return res.status(200).json({ success: true, predictionId: existing.id, action: 'updated' });
        }
      }

      return res.status(500).json({ error: 'Failed to create prediction', detail: upsertError.message });
    }

    return res.status(201).json({ success: true, predictionId: result.id, action: 'created' });

  } catch (err: any) {
    console.error('record-prediction error:', err);
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
