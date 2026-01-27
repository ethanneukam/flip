import { supabase } from "@/lib/supabaseClient";
import { generateNextPermutation } from "@/lib/wordGenerator";

export default async function handler(req: any, res: any) {
  // 1. Get the last ticker we generated
  const { data: lastItem } = await supabase
    .from("items")
    .select("ticker")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let currentTicker = lastItem?.ticker || "AAA";
  const newBatch = [];

  // 2. Generate the next 100 possible tickers
  for (let i = 0; i < 100; i++) {
    currentTicker = generateNextPermutation(currentTicker);
    newBatch.push({
      ticker: currentTicker,
      title: `NODE_${currentTicker}`, // Placeholder title for scraper to update
      price: 0,
      flip_price: 0,
      confidence: 0
    });
  }

  // 3. Upsert to DB
  const { error } = await supabase.from("items").upsert(newBatch);

  if (error) return res.status(500).json({ error });
  return res.status(200).json({ 
    status: "Nodes Injected", 
    range: `${newBatch[0].ticker} -> ${currentTicker}` 
  });
}
