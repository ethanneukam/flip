import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { user_id, amount, reason, related_id } = req.body;
  if (!user_id || !amount) return res.status(400).json({ error: "user_id and amount required" });

  try {
    // Upsert balance
    await supabase.from("flip_coins").upsert({
      user_id,
      balance: supabase.raw("coalesce(balance,0) + ?", [amount]),
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

    // Insert transaction record
    await supabase.from("flip_coin_transactions").insert({
      user_id,
      amount,
      type: "award",
      reason,
      related_id,
      created_at: new Date().toISOString()
    });

    return res.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || "server error" });
  }
}
