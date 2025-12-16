import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return res.status(500).json({ error: "Supabase env vars not configured" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing or invalid item ID" });
  }

  try {
    const { data: itemData, error: itemError } = await supabase
      .from("items")
      .select("id, title, price, stock")
      .eq("id", id)
      .single();

    if (itemError) throw itemError;

    const { data: externalPrices, error: extError } = await supabase
      .from("external_prices")
      .select("source, price, url, condition, last_checked")
      .eq("item_id", id)
      .order("last_checked", { ascending: false });

    if (extError) throw extError;

    const allPrices = [
      ...(itemData?.price
        ? [{ source: "Flip", price: itemData.price, url: null }]
        : []),
      ...(externalPrices ?? []).map((p) => ({
        source: p.source,
        price: p.price,
        url: p.url,
        condition: p.condition,
      })),
    ];

    const bestPrice =
      allPrices.length > 0
        ? allPrices.reduce((prev, curr) =>
            curr.price < prev.price ? curr : prev
          )
        : null;

    res.status(200).json({
      item: itemData,
      externalPrices,
      bestPrice,
      allPrices,
    });
  } catch (err) {
    console.error("Price fusion API error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
