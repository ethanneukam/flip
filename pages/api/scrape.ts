import { createClient } from '@supabase/supabase-js';
import { main as runScraper } from '../../scripts/scrapeRunner';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req, res) {
  const { keyword } = req.query;
  if (!keyword) return res.status(400).json({ error: "Search term required" });

  // 1. Check Cache: See if we have prices from the last 5 minutes
  const fiveMinsAgo = new Date(Date.now() - 5 * 60000).toISOString();
  
  const { data: recentLogs } = await supabase
    .from('market_data')
    .select('id')
    .ilike('title', `%${keyword}%`)
    .gte('created_at', fiveMinsAgo)
    .limit(1);

  if (recentLogs && recentLogs.length > 0) {
    return res.status(200).json({ status: "cached", message: "Data is fresh!" });
  }

  // 2. Trigger Scrape: Run the scraper in the background
  // We don't 'await' this so the API responds instantly to the UI
  runScraper(keyword).catch(console.error);

  return res.status(200).json({ status: "scraping", message: "Live search started..." });
}
