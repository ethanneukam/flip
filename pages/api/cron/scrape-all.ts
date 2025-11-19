import type { NextApiRequest, NextApiResponse } from "next";
import { Queue } from "bullmq";
import { createClient } from "@supabase/supabase-js";

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const scrapeQueue = new Queue("scrape-jobs", { connection });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Only allow GET
    if (req.method !== "GET")
      return res.status(405).json({ error: "Method not allowed" });

    // 1. fetch all items
    const { data: items, error } = await supabase
      .from("items")
      .select("id, name");

    if (error) throw error;

    if (!items.length) {
      return res.status(200).json({ message: "No items to scrape." });
    }

    // 2. add each item to BullMQ queue
    for (const item of items) {
      await scrapeQueue.add(
        "scrape-item",
        { item_id: item.id, keyword: item.name },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 3000 },
          removeOnComplete: true,
        }
      );
    }

    return res.status(200).json({
      status: "scheduled",
      count: items.length,
    });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}