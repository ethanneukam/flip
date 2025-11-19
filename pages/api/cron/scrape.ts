import { Queue } from "bullmq";
import dotenv from "dotenv";
dotenv.config();

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
};

const scrapeQueue = new Queue("scrape-jobs", { connection });

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end("Unauthorized");
  }

  try {
    // Get items from Supabase
    const itemsRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/items?select=id,name`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const items = await itemsRes.json();

    for (const item of items) {
      await scrapeQueue.add("scrape", {
        item_id: item.id,
        keyword: item.name,
      });
    }

    res.status(200).json({ queued: items.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cron failed" });
  }
}