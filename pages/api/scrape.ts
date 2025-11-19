// pages/api/scrape.ts
import { scrapeQueue } from "../../queues/scrapeQueue";

export default async function handler(req, res) {
  const { keyword, item_id } = req.body;

  await scrapeQueue.add("scrape-item", {
    keyword,
    item_id,
  });

  return res.status(200).json({ ok: true });
}