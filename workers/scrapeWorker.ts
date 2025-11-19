// workers/scrapeWorker.ts
import { Worker } from "bullmq";
import { chromium } from "playwright";
import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

import { allScrapers } from "../scrapers";
import { runScraperWithRetries } from "../lib/runScraperWithRetries";

// Redis connection
const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
};

// Random timeout helper
const sleep = (min = 800, max = 2000) =>
  new Promise((res) => setTimeout(res, min + Math.random() * (max - min)));

const worker = new Worker(
  "scrape-jobs",
  async (job) => {
    const { item_id, keyword } = job.data;

    // --- STEALTH BROWSER CONFIG ---
    const browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--disable-infobars",
        "--disable-webgl",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
    });

    const context = await browser.newContext({
      userAgent: process.env.USER_AGENT || undefined,
      viewport: {
        width: 1280 + Math.floor(Math.random() * 200),
        height: 720 + Math.floor(Math.random() * 200),
      },
      locale: "en-US",
      timezoneId: "America/New_York",
      javaScriptEnabled: true,
    });

    const page = await context.newPage();

    // --- Loop Scrapers Registry ---
    for (const scraper of allScrapers) {
      try {
        const result = await runScraperWithRetries({
          page,
          scraper,
          item_id,
          keyword,
          maxRetries: 2,
        });

        if (result) {
          await supabase.from("external_prices").upsert(
            {
              item_id,
              source: scraper.source,
              price: result.price,
              url: result.url,
              last_checked: new Date().toISOString(),
            },
            { onConflict: ["item_id", "source"] }
          );
        }
      } catch (err) {
        console.error(`[Scraper ${scraper.source}] Error:`, err);
      }

      await sleep(); // randomized delay for stealth
    }

    await browser.close();
  },
  { connection }
);

// Worker events
worker.on("completed", (job) =>
  console.log(`✔️ Scrape job completed: ${job.id}`)
);
worker.on("failed", (job, err) =>
  console.error(`❌ Scrape job failed: ${job?.id}`, err)
);