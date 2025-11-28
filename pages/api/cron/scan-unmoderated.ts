// pages/api/cron/scan-unmoderated.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { moderateImage } from "../../../lib/imageModeration";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // OPTIONAL: require CRON_SECRET header
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  // find items where moderated is null or false
  const { data: items } = await supabase.from("items").select("id, image_url").is("moderated", null).limit(200);

  for (const item of items || []) {
    try {
      const r = await moderateImage(item.image_url);
      await supabase.from("review_queue").insert({
        item_id: item.id,
        image_url: item.image_url,
        provider: r.provider,
        raw_result: r.raw,
        score: r.score,
        status: r.verdict === "safe" ? "approved" : "flagged",
      });
      if (r.verdict === "safe") {
        await supabase.from("items").update({ moderated: true }).eq("id", item.id);
      }
    } catch (err) {
      console.error("scan error", err);
    }
  }

  return res.status(200).json({ ok: true, scanned: items?.length || 0 });
}
