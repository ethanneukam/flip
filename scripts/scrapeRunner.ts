// --- LOAD ENV FIRST ---
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { chromium, Browser, Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import UserAgent from "user-agents";

// Import all scrapers from your index file
import { allScrapers } from "../scrapers";

// --- Supabase Setup ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Interfaces (Matched to your scrapers) ---
export interface ScraperResult {
  price: number;
  url: string;
  condition?: string; // Made optional to fix the build error
  title?: string;
  image_url?: string | null;
  ticker?: string;
}

export interface Scraper {
  source: string;
  scrape: (page: any, keyword: string) => Promise<ScraperResult | null>;
}

// --- Human-like Helpers ---
const wait = (min = 100, max = 400) =>
  new Promise((res) => setTimeout(res, Math.random() * (max - min) + min));

async function humanScroll(page: Page) {
  const scrolls = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < scrolls; i++) {
    const distance = Math.random() * 700 + 200;
    await page.mouse.wheel(0, distance);
    await wait(400, 900);
  }
}

async function humanMouse(page: Page) {
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * 900 + 50;
    const y = Math.random() * 700 + 50;
    await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 20) + 5 });
    await wait(50, 200);
  }
}

// --- Database Loader ---
async function getItemsToScrape() {
  const { data, error } = await supabase
    .from("items")
    .select("id, title");

  if (error) {
    console.error("❌ Failed loading items:", error);
    return [];
  }

  return data.map((item: any) => ({
    item_id: item.id,
    keyword: item.title,
  }));
}

// --- Run individual scraper ---
async function runScraper({
  page,
  scraper,
  item_id,
  keyword,
}: {
  page: Page;
  scraper: Scraper;
  item_id: string;
  keyword: string;
}) {
  try {
    const result = await scraper.scrape(page, keyword);

    if (!result || !result.price) {
      console.log(`[SKIP] ${scraper.source} → No price found`);
      return null;
    }

    // Insert into market_data table
    const { error } = await supabase.from("market_data").insert([
      {
        item_id,
        source: scraper.source,
        price: result.price,
        url: result.url,
        condition: result.condition || "New", // Fallback if missing
        title: result.title || null,
        image_url: result.image_url || null,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) throw error;

    console.log(`[OK] ${scraper.source}: $${result.price} saved`);
    return result;
  } catch (err: any) {
    console.error(`[ERROR] ${scraper.source}:`, err.message);
    return null;
  }
}

// --- Main Stealth Runner ---
async function main() {
  const browser: Browser = await chromium.launch({
    headless: true, 
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });

  const context = await browser.newContext({
    userAgent: new UserAgent().toString(),
    viewport: { width: 1280, height: 720 },
  });

  const page: Page = await context.newPage();
  const itemsToScrape = await getItemsToScrape();

  for (const item of itemsToScrape) {
    console.log(`\n--- Starting Market Scan: ${item.keyword} ---`);
    
    let sumPrices = 0;
    let successfulScrapes = 0;

    for (const scraper of allScrapers) {
      const result = await runScraper({
        page,
        scraper,
        item_id: item.item_id,
        keyword: item.keyword,
      });

      if (result && result.price > 0) {
        sumPrices += result.price;
        successfulScrapes++;
      }

      await wait(1500, 3000);
    }

    // ✅ Update "Flip Price" in items table
    if (successfulScrapes > 0) {
      const flipPrice = sumPrices / successfulScrapes;
      console.log(`✨ FLIP PRICE: $${flipPrice.toFixed(2)}`);

      await supabase
        .from("items")
        .update({ 
          flip_price: flipPrice, 
          last_updated: new Date().toISOString() 
        })
        .eq("id", item.item_id);
    }
  }

  await browser.close();
  console.log("\n✅ Market Scan Complete!");
}

main().catch(console.error);
