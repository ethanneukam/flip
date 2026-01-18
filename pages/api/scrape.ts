import { createClient } from '@supabase/supabase-js';
import { main as runScraper } from '/scripts/scrapeRunner';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
  
  const { keyword } = req.body;
  if (!keyword) return res.status(400).json({ error: "Search term required" });

  // 1. Ensure the item exists in our tracking table first
  // This allows the UI to have an ID to listen to immediately
  const { data: item } = await supabase
    .from('items')
    .upsert({ title: keyword }, { onConflict: 'title' })
    .select()
    .single();

  // 2. Check Cache: See if we have prices from the last 10 minutes
  const tenMinsAgo = new Date(Date.now() - 10 * 60000).toISOString();
  
  const { data: recentLogs } = await supabase
    .from('price_logs')
    .select('id')
    .eq('item_id', item?.id)
    .gte('created_at', tenMinsAgo)
    .limit(1);

  if (recentLogs && recentLogs.length > 0) {
    return res.status(200).json({ 
      status: "cached", 
      itemId: item?.id,
      message: "Showing cached market data." 
    });
  }

  // 3. Dispatch Scraper in background
  runScraper(keyword).catch(console.error);

  return res.status(200).json({ 
    status: "scraping", 
    itemId: item?.id,
    message: "Deep-scanning market providers..." 
  });
}
