// scripts/enqueueScrapes.ts
import { Queue } from "bullmq";
import dotenv from "dotenv";
dotenv.config();

const connection = { host: process.env.REDIS_HOST || "127.0.0.1", port: Number(process.env.REDIS_PORT || 6379) };
const queue = new Queue("scrape-jobs", { connection });

const itemsToScrape = [
  // map from your items table or itemsToScrape file
  { item_id: "ITEM_UUID_1", keyword: "Nintendo Switch" },
  // ...
];

(async () => {
  for (const item of itemsToScrape) {
    await queue.add("scrape-item", item, { attempts: 3, backoff: { type: "exponential", delay: 1000 } });
    console.log("Enqueued", item.keyword);
  }
  process.exit(0);
})();