import { createClient } from '@supabase/supabase-js';

// We REMOVED the import of scrapeRunner here to stop the Vercel crash.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
  
  const { keyword } = req.body;
  if (!keyword) return res.status(400).json({ error: "Search term required" });

  // 1. Ensure the item exists in our tracking table
  const { data: item, error: itemError } = await supabase
    .from('items')
    .upsert({ title: keyword }, { onConflict: 'title' })
    .select()
    .single();

  if (itemError) return res.status(500).json({ error: "Database error" });

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

  // 3. Dispatch: We don't call runScraper() here anymore!
  // Your Render Oracle "Infinite Mode" will pick this up automatically 
  // from the 'items' table on its next pulse.
  
  return res.status(200).json({ 
    status: "scraping", 
    itemId: item?.id,
    message: "Deep-scanning market providers via Render Oracle..." 
  });
}
