import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { category } = req.body; // e.g., "Rolex Submariner"

  try {
    // 1. Trigger your scraper to find MULTIPLE listings (adjust your scraper logic to return an array)
    const response = await fetch(`${process.env.SCRAPER_URL}/bulk?query=${category}`);
    const products = await response.json(); // Expected: [{title, price, image, ticker}, ...]

    const results = await Promise.all(products.map(async (item: any) => {
      // 2. Upsert into 'items' table for the global directory
      await supabase.from('items').upsert({
        title: item.title,
        ticker: item.ticker,
        flip_price: item.price,
        image_url: item.image
      });

      // 3. Upsert into 'market_data' for the charts
      return await supabase.from('market_data').upsert({
        ticker: item.ticker,
        name: item.title,
        price: item.price,
        last_updated: new Date()
      });
    }));

    res.status(200).json({ message: `Successfully ingested ${results.length} assets.` });
  } catch (error) {
    res.status(500).json({ error: "Mass scrape failed" });
  }
}
