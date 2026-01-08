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
// Import the result type to ensure alignment
import { ScraperResult } from "../scripts/scrapeRunner";

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
      userAgent: process.env.USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
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
        // cast the result as the array type we now expect
        const results = await runScraperWithRetries(scraper, page, keyword, 2) as ScraperResult[] | null;

        if (results && results.length > 0) {
          console.log(`[Worker] ${scraper.source} found ${results.length} items for ${keyword}`);
          
          // Loop through the array of results found by the scraper
          for (const item of results) {
            await supabase.from("external_prices").upsert(
              {
                item_id,
                source: scraper.source,
                price: item.price,
                url: item.url,
                title: item.title || null,
                image_url: item.image_url || null,
                condition: item.condition || "Used",
                last_checked: new Date().toISOString(),
              },
              { onConflict: 'url' } // 'url' is the unique identifier for specific listings
            );
          }
        }
      } catch (err) {
        console.error(`[Scraper ${scraper.source}] Error:`, err);
      }

      await sleep(1500, 3000); // slightly longer delay for stealth
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
