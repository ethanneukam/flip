// lib/indices.ts
import { supabase } from './supabaseClient';

export async function updateMarketIndices() {
  const categories = ['Luxury', 'Electronics', 'Sneakers', 'TCG'];
  
  for (const cat of categories) {
    const { data } = await supabase
      .from('oracle_prices')
      .select('price, change_24h')
      .eq('category', cat);
      
    if (!data || data.length === 0) continue;
    
    const avgValue = data.reduce((sum, item) => sum + item.price, 0) / data.length;
    const avgChange = data.reduce((sum, item) => sum + item.change_24h, 0) / data.length;
    
    await supabase.from('market_indices').upsert({
      category_name: cat,
      current_value: avgValue,
      change_24h: avgChange,
      constituent_count: data.length
    });
  }
}
