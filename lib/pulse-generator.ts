// lib/pulse-generator.ts
import { supabase } from './supabaseClient';

export async function generateMarketSignals() {
  // 1. Fetch prices updated in the last scrape cycle
  const { data: latestPrices } = await supabase
    .from('oracle_prices')
    .select('*')
    .gt('last_scrape_timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (!latestPrices) return;

  for (const asset of latestPrices) {
    // 2. Logic: Only post if move is > 3%
    const change = Math.abs(asset.change_24h);
    
    if (change >= 3.0) {
      const direction = asset.change_24h > 0 ? 'surged' : 'dropped';
      
      // 3. Insert into a 'feed_events' table (or your items table if you share it)
      await supabase.from('feed_events').insert({
        type: 'ORACLE_SIGNAL',
        title: `${asset.asset_name} has ${direction} ${change}%`,
        metadata: {
          sku: asset.sku,
          price: asset.price,
          change: asset.change_24h,
          category: asset.category
        },
        created_at: new Date().toISOString()
      });
    }
  }
}
