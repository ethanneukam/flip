// lib/portfolio.ts
import { supabase } from './supabaseClient';

export async function getUserPortfolio(userId: string) {
  // 1. Get all items from user's vault
  const { data: items } = await supabase
    .from('items')
    .select('sku, title')
    .eq('user_id', userId);

  if (!items || items.length === 0) return { totalValue: 0, avgChange: 0, count: 0 };

  const skus = items.map(i => i.sku).filter(Boolean);

  // 2. Get latest Oracle prices for those SKUs
  const { data: prices } = await supabase
    .from('oracle_prices')
    .select('sku, price, change_24h')
    .in('sku', skus);

  // 3. Calculate Totals
  let totalValue = 0;
  let totalChange = 0;
  let priceCount = 0;

  items.forEach(item => {
    const marketData = prices?.find(p => p.sku === item.sku);
    if (marketData) {
      totalValue += marketData.price;
      totalChange += marketData.change_24h;
      priceCount++;
    }
  });

return {
    totalValue: Number(totalValue || 0),
    avgChange: Number(priceCount > 0 ? totalChange / priceCount : 0),
    count: Number(items?.length || 0)
  };
}
