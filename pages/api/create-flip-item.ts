import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const VALID_CONDITIONS = ['mint', 'excellent', 'good', 'fair', 'poor'] as const;
const VALID_STATUSES = ['draft', 'listed', 'sold', 'archived'] as const;

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

  const {
    title,
    description,
    category,
    subcategory,
    brand,
    model,
    condition,
    imageUrls,
    status,
  } = req.body;

  // Validate required fields
  if (!title || !category || !condition) {
    return res.status(400).json({ error: 'Missing required fields: title, category, condition' });
  }

  if (!VALID_CONDITIONS.includes(condition)) {
    return res.status(400).json({ error: `Invalid condition. Must be one of: ${VALID_CONDITIONS.join(', ')}` });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  if (imageUrls && (!Array.isArray(imageUrls) || imageUrls.some((u: unknown) => typeof u !== 'string'))) {
    return res.status(400).json({ error: 'imageUrls must be an array of strings' });
  }

  try {
    const { data: flipItem, error: insertError } = await supabase
      .from('flip_items')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: (description ?? '').trim(),
        category: category.trim().toLowerCase(),
        subcategory: subcategory?.trim().toLowerCase() ?? null,
        brand: brand?.trim() ?? null,
        model: model?.trim() ?? null,
        condition,
        ai_confidence: 0,
        image_urls: imageUrls ?? [],
        status: status ?? 'draft',
      })
      .select('id')
      .single();

    if (insertError) {
      return res.status(500).json({ error: 'Failed to create flip item', detail: insertError.message });
    }

    // Note: trg_after_flip_item_created trigger will fire automatically,
    // calling /api/compute-market-signal for this item.

    return res.status(201).json({ success: true, flipItemId: flipItem.id });

  } catch (err: any) {
    console.error('create-flip-item error:', err);
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
