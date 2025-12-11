import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ANON_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing or invalid item ID" });
  }

  try {
    // 1️⃣ Fetch internal price from Flip items table
    const { data: itemData, error: itemError } = await supabase
      .from("items")
      .select("id, title, price, stock")
      .eq("id", id)
      .single();

    if (itemError) throw itemError;

    // 2️⃣ Fetch latest external prices
    const { data: externalPrices, error: extError } = await supabase
      .from("external_prices")
      .select("source, price, url, condition, last_checked")
      .eq("item_id", id)
      .order("last_checked", { ascending: false });

    if (extError) throw extError;

    // 3️⃣ Compute best price across all sources
    const allPrices = [
      ...(itemData?.price ? [{ source: "Flip", price: itemData.price, url: null }] : []),
      ...externalPrices.map((p) => ({
        source: p.source,
        price: p.price,
        url: p.url,
        condition: p.condition,
      })),
    ];

    const bestPrice = allPrices.reduce((prev, curr) =>
      curr.price < prev.price ? curr : prev
    , allPrices[0]);

    res.status(200).json({
      item: itemData,
      externalPrices,
      bestPrice,
      allPrices,
    });
  } catch (err: any) {
    console.error("Price fusion API error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
