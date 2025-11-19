import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { Queue } from "bullmq";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
};

const scrapeQueue = new Queue("scrape-jobs", { connection });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 🔐 AUTH CHECK — required for Vercel Cron
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 1️⃣ Get all active items that need scraping
    const { data: items, error } = await supabase
      .from("items")
      .select("id, keywords")
      .eq("active", true);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "Failed to load items" });
    }

    if (!items || items.length === 0) {
      return res.status(200).json({ message: "No active items to scrape" });
    }

    // 2️⃣ Push jobs into Redis/BullMQ queue
    for (const item of items) {
      await scrapeQueue.add(
        "scrape",
        {
          item_id: item.id,
          keyword: item.keywords,
        },
        {
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
    }

    // 3️⃣ Return success
    return res.status(200).json({
      message: "Scrape jobs dispatched",
      count: items.length,
    });
  } catch (err) {
    console.error("Cron error:", err);
    return res.status(500).json({ error: "Cron failed" });
  }
}