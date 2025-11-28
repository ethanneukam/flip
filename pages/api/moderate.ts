// pages/api/moderate.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { moderateImage } from "../../lib/imageModeration";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { item_id, image_url } = req.body;
  if (!item_id || !image_url) return res.status(400).json({ error: "missing_fields" });

  try {
    const result = await moderateImage(image_url);

    // insert into review_queue
    const { data, error } = await supabase.from("review_queue").insert([
      {
        item_id,
        image_url,
        provider: result.provider,
        raw_result: result.raw,
        score: result.score,
        status: result.verdict === "safe" ? "approved" : "flagged",
        created_at: new Date().toISOString(),
      },
    ]).select().single();

    if (error) throw error;

    // Optionally: If approved, update items table column like `is_moderated = true`
    if (result.verdict === "safe") {
      await supabase.from("items").update({ moderated: true }).eq("id", item_id);
    }

    return res.status(200).json({ ok: true, verdict: result.verdict, score: result.score, queue: data });
  } catch (err: any) {
    console.error("moderate error:", err);
    return res.status(500).json({ error: err.message || "moderation_error" });
  }
}
