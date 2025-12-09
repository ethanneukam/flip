// --- LOAD ENV FIRST ---
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// --- Imports ---
import { chromium, Browser, Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import UserAgent from "user-agents";
// ❌ REMOVE this line
// import { itemsToScrape } from "./itemsToScrape"; 
import { amazonScraper } from "../scrapers/amazonScraper";
import { allScrapers } from "../scrapers";

// --- Supabase ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ DYNAMIC ITEMS LOADER (replaces itemsToScrape file)
async function getItemsToScrape() {
  const { data, error } = await supabase
    .from("items") // your items table
    .select("id, title"); // adjust if you use "keyword"

  if (error) {
    console.error("❌ Failed loading items:", error);
    return [];
  }

  return data.map((item: any) => ({
    item_id: item.id,
    keyword: item.title, // or item.keyword
  }));
}

// --- Types ---
export interface ScraperResult {
  price: number;
  url: string;
  shipping?: number | null;
  condition?: string | null;
  seller_rating?: number | null;
}

export interface Scraper {
  source: string;
  run: (page: Page, keyword: string) => Promise<ScraperResult | null>;
}

// --- Human-like helpers ---
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
    const result = await scraper.run(page, keyword);

    if (!result) {
      console.log(`[SKIP] ${scraper.source} → No price found`);
      return null;
    }

    // Insert into Supabase
    await supabase.from("external_prices").insert([
      {
        item_id,
        source: scraper.source,
        price: result.price,
        url: result.url,
        shipping: result.shipping ?? null,
        condition: result.condition ?? null,
        seller_rating: result.seller_rating ?? null,
        last_checked: new Date().toISOString(),
      },
    ]);

    console.log(`[OK] ${scraper.source}: $${result.price} (${keyword}) → saved`);
    return result;
  } catch (err: any) {
    console.error(`[ERROR] ${scraper.source}:`, err.message);
    return null;
  }
}

// --- MAX STEALTH RUNNER ---
async function main() {
  const browser: Browser = await chromium.launch({
    headless: false,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-web-security",
      "--disable-site-isolation-trials",
      "--no-sandbox",
    ],
  });

  const context = await browser.newContext({
    userAgent: new UserAgent().toString(),
    viewport: { width: 1280, height: 720 },
    locale: "en-US",
  });

  const page: Page = await context.newPage();

  // ✅ LOAD ITEMS DYNAMICALLY
  const itemsToScrape = await getItemsToScrape();

  for (const item of itemsToScrape) {
    console.log(`\n🔍 Scraping: ${item.keyword}`);

    // Amazon max stealth
    await runScraper({
  page,
  scraper: amazonScraper,
  item_id: item.item_id,
  keyword: item.keyword,
});


    // Human-like behavior
    await wait(1200, 2500);
    await humanScroll(page);
    await humanMouse(page);
  }

  await browser.close();
  console.log("\n✅ All items scraped!");
}

// --- Run ---
main().catch(console.error);
