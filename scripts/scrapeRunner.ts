import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { chromium, Browser, BrowserContext, Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import UserAgent from "user-agents";
import { allScrapers } from "../scrapers";

export interface ScraperResult {
  price: number;
  url: string;
  condition?: string;
  title?: string;
  image_url?: string | null;
  ticker?: string;
}

export interface Scraper {
  source: string;
  scrape: (page: any, keyword: string) => Promise<ScraperResult | null>;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * NEW: Stealth & Performance Optimization
 * Blocks heavy assets to prevent timeouts and "Target Crashed" errors
 * while allowing image URLs to be read from the HTML.
 */
async function applyStealthAndOptimization(page: Page) {
  // 1. Block heavy resources (Images/CSS/Fonts) from downloading
  await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,css,woff,woff2,ttf,eot,mp4,ad,ads,doubleclick,google-analytics}', (route) => {
    return route.abort();
  });

  // 2. Set extra headers to look like a real browser
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  });

  // 3. Hide automation footprint
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
}

const wait = (min = 1000, max = 3000) =>
  new Promise((res) => setTimeout(res, Math.random() * (max - min) + min));

async function getItemsToScrape(searchKeyword?: string) {
  if (searchKeyword) {
    console.log(`🎯 On-Demand Mode: Searching for "${searchKeyword}"`);
    const { data: item, error } = await supabase
      .from("items")
      .upsert({ title: searchKeyword }, { onConflict: 'title' })
      .select()
      .single();

    if (error) {
      console.error("❌ Error setting up On-Demand item:", error.message);
      return [];
    }
    return [{ item_id: item.id, keyword: item.title }];
  }

  console.log("📡 Scheduled Mode: Fetching all tracked items...");
  const { data, error } = await supabase.from("items").select("id, title");
  if (error) return [];
  return data.map((item: any) => ({ item_id: item.id, keyword: item.title }));
}

async function runScraper(context: BrowserContext, scraper: any, item_id: string, keyword: string) {
  // Fix: Generate UA here to be used if needed, but context handles it mostly.
  const page = await context.newPage();
  
  // Apply the new "Low Data" stealth mode
  await applyStealthAndOptimization(page);

  page.setDefaultTimeout(30000); 

  try {
    console.log(`    🔍 [${scraper.source}] Searching: "${keyword}"`);
    
    const result = await Promise.race([
      scraper.scrape(page, keyword),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Hard Timeout")), 45000))
    ]) as any;

    if (result && result.price) {
      console.log(`    ✅ [${scraper.source}] Found: $${result.price}. Syncing to DB...`);

      // 1. LOG TO MARKET_DATA
      const { error: mErr } = await supabase.from("market_data").insert([{
        item_id,
        source: scraper.source,
        price: result.price,
        url: result.url,
        condition: result.condition || "New",
        title: result.title || null,
        image_url: result.image_url || null
      }]);
      if (mErr) console.error("    ❌ Market Data DB Error:", mErr.message);

      // 2. LOG TO PRICE_LOGS
      const { error: pErr } = await supabase.from("price_logs").insert([{
        item_id,
        price: result.price,
        source: scraper.source,
        url: result.url
      }]);
      if (pErr) console.error("    ❌ Price Logs DB Error:", pErr.message);

      // 3. LOG TO FEED_EVENTS
      const { error: fErr } = await supabase.from("feed_events").insert([{
        type: 'ORACLE_ALERT',
        title: `Price Signal: ${result.title || keyword}`,
        description: `Market bot detected a listing for $${result.price.toLocaleString()} on ${scraper.source}.`,
        metadata: {
          item_id: item_id,
          ticker: keyword,
          price: result.price,
          source: scraper.source,
          image_url: result.image_url
        }
      }]);
      if (fErr) console.error("    ❌ Feed Events DB Error:", fErr.message);

      if (!mErr && !pErr && !fErr) console.log("    ✨ Successfully synced all data.");

      return result.price;
    }
    return null;
  } catch (err: any) {
    console.error(`    ❌ [${scraper.source}] Error: ${err.message}`);
    return null;
  } finally {
    await page.close();
  }
}

export async function main(searchKeyword?: string) {
  console.log("🚀 Starting Global Price Tracker...");
  const items = await getItemsToScrape(searchKeyword);
  if (items.length === 0) return;

  const browser = await chromium.launch({ 
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', 
      '--disable-blink-features=AutomationControlled'
    ] 
  });

  // Fix: UserAgent is set here at the context level where it is valid
  const context = await browser.newContext({ 
    userAgent: new UserAgent({ deviceCategory: 'desktop' }).toString(),
    viewport: { width: 1280, height: 720 }
  });

  for (const item of items) {
    console.log(`\n--- Item: ${item.keyword} ---`);
    let sum = 0;
    let count = 0;

    for (const scraper of allScrapers) {
      const price = await runScraper(context, scraper, item.item_id, item.keyword);
      if (price) {
        sum += price;
        count++;
      }
      await wait(2000, 4000); 
    }

    if (count > 0) {
      const avgPrice = sum / count;
      console.log(`✨ Average Market Price for ${item.keyword}: $${avgPrice.toFixed(2)}`);
      await supabase.from("items").update({ 
        flip_price: avgPrice, 
        last_updated: new Date().toISOString() 
      }).eq("id", item.item_id);
    }
  }

  await browser.close();
  console.log("\n🏁 Scrape Session Complete.");
}

const manualKeyword = process.argv[2];
main(manualKeyword).then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
});
