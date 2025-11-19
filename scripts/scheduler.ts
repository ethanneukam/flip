import cron from "node-cron";
import { Queue } from "bullmq";
import dotenv from "dotenv";
dotenv.config();

const connection = { host: process.env.REDIS_HOST || "127.0.0.1", port: Number(process.env.REDIS_PORT || 6379) };
const queue = new Queue("scrape-jobs", { connection });

const itemsToScrape = require("../itemsToScrape").itemsToScrape; // or import

// run every hour at minute 5 (so avoid cron thundering at top of hour)
cron.schedule("5 * * * *", async () => {
  console.log("Scheduler enqueue started:", new Date().toISOString());
  for (const item of itemsToScrape) {
    await queue.add("scrape-item", { item_id: item.id, keyword: item.search_keyword }, { attempts: 3 });
  }
  console.log("Scheduler enqueue finished:", new Date().toISOString());
});