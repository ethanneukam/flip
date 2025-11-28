// pages/api/promotions/click.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPA_URL, SUPA_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const body = req.body || (await parseJson(req));
  const { promotion_id, item_id, click_id } = body || {};

  if (!promotion_id) return res.status(400).json({ error: "promotion_id required" });

  try {
    const ua = String(req.headers["user-agent"] || "");
    const ipHeader = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;
    const ip = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader;

    // Idempotency: skip duplicate click_id
    if (click_id) {
      const { data: existing } = await supabase
        .from("promotion_clicks")
        .select("id")
        .eq("promotion_id", promotion_id)
        .eq("click_id", click_id)
        .limit(1)
        .maybeSingle();

      if (existing) return res.status(200).json({ ok: true, duplicate: true });
    }

    // Snapshot CPC for audit
    const { data: promo } = await supabase
      .from("promotions")
      .select("cpc, status")
      .eq("id", promotion_id)
      .single();

    if (!promo || promo.status !== "active") {
      return res.status(400).json({ error: "promotion inactive or not found" });
    }

    await supabase.from("promotion_clicks").insert([
      {
        promotion_id,
        user_id: null,
        session_id: null,
        ip: ip ? String(ip) : null,
        user_agent: ua ?? null,
        click_value: promo?.cpc ?? null,
        click_id: click_id ?? null,
      },
    ]);

    return res.status(201).json({ ok: true });
  } catch (err: any) {
    console.error("promotions/click error:", err);
    return res.status(500).json({ error: err.message || "server error" });
  }
}

// helper for raw JSON body (when bodyParser disabled)
async function parseJson(req: NextApiRequest) {
  return new Promise<any>((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}
