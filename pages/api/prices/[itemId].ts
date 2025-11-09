import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../../lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { itemId } = req.query;

  if (!itemId) {
    return res.status(400).json({ error: "Missing itemId" });
  }

  const { data, error } = await supabase
    .from("price_history")
    .select("source, price, recorded_at")
    .eq("item_id", itemId)
    .order("recorded_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({ prices: data });
}