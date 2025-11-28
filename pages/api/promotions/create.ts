// pages/api/promotions/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPA_URL, SUPA_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { item_id, seller_id, cpc, budget, start_at, end_at } = req.body || {};
    if (!item_id || !seller_id || !cpc) return res.status(400).json({ error: "item_id, seller_id and cpc required" });

    const payload = {
      item_id,
      seller_id,
      cpc: Number(cpc),
      budget: budget ? Number(budget) : null,
      start_at: start_at ? new Date(start_at).toISOString() : new Date().toISOString(),
      end_at: end_at ?? null,
    };

    const { data, error } = await supabase.from("promotions").insert([payload]).select().single();
    if (error) throw error;
    return res.status(201).json({ ok: true, promotion: data });
  } catch (err: any) {
    console.error("promotions/create error:", err);
    return res.status(500).json({ error: err.message || "server error" });
  }
}
