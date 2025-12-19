// pages/api/item/[id]/market-prices.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  if (!id) return res.status(400).json({ error: "missing id" });

  try {
    // Flip internal price history
const { data } = await readPriceHistory(id);


    // External prices latest per source (lowest/latest)
    const { data: external } = await supabase
      .from("external_prices")
      .select("source, price, url, last_checked")
      .eq("item_id", id)
      .order("price", { ascending: true });

    // Build merged history: combine flipHistory + external last_checked points
    const history: any[] = [];

    (flipHistory || []).forEach((p: any) => {
      history.push({ date: new Date(p.created_at).toLocaleDateString(), price: p.price, source: "Flip" });
    });

    (external || []).forEach((p: any) => {
      history.push({ date: p.last_checked ? new Date(p.last_checked).toLocaleDateString() : new Date().toLocaleDateString(), price: p.price, source: p.source });
    });

    // sort by date ascending
    history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.status(200).json({
      flipPrices: (flipHistory || []).map((p: any) => ({ date: new Date(p.created_at).toLocaleDateString(), price: p.price })),
      externalPrices: external || [],
      history,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
}
