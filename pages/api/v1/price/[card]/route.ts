import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use Service Role Key for the backend to bypass RLS when updating request counts
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function GET(
  req: Request,
  { params }: { params: { card: string } }
) {
  try {
    const cardName = params.card;
    const apiKey = req.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API Key' }, { status: 401 });
    }

    // 1. VALIDATE THE API KEY
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('api_keys')
      .select('user_id')
      .eq('key_value', apiKey)
      .single();

    if (keyError || !keyData) {
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 403 });
    }

    // 2. INCREMENT REQUEST COUNT (Usage Tracking)
    const { error: updateError } = await supabaseAdmin.rpc('increment_request_count', {
      target_user_id: keyData.user_id
    });

    // 3. FETCH THE ACTUAL PRICE
    // This is where you'd call TCGPlayer, eBay, or your own Scraper DB
    // For now, we'll return a mock "Live" price
   // ... (Keep the API Key validation and increment logic from before)

// 3. FETCH REAL DATA FROM SUPABASE
const { data: item, error: itemError } = await supabaseAdmin
  .from('items')
  .select('name, flip_price, last_scraped')
  // We use .ilike to make it case-insensitive (e.g., 'charizard' matches 'Charizard')
  .ilike('name', decodeURIComponent(cardName)) 
  .single();

if (itemError || !item) {
  return NextResponse.json({ 
    error: 'Asset not found in Terminal database',
    requested_card: decodeURIComponent(cardName)
  }, { status: 404 });
}

// 4. RETURN THE TRUE DATA
return NextResponse.json({
  card: item.name,
  market_price: item.flip_price, // This pulls directly from your column
  currency: "USD",
  last_updated: item.last_scraped || new Date().toISOString(),
  status: "VERIFIED_QUANTUM_DATA",
  provider: "Flip Terminal Oracle"
});
} catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}