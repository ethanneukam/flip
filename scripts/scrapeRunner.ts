import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { chromium, Browser, BrowserContext } from "playwright";
import { createClient } from "@supabase/supabase-js";
import UserAgent from "user-agents";
import { allScrapers } from "../scrapers";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const wait = (min = 1000, max = 3000) =>
  new Promise((res) => setTimeout(res, Math.random() * (max - min) + min));

async function getItemsToScrape() {
  const { data, error } = await supabase.from("items").select("id, title");
  if (error) return [];
  return data.map((item: any) => ({ item_id: item.id, keyword: item.title }));
}

async function runScraper(context: BrowserContext, scraper: any, item_id: string, keyword: string) {
  const page = await context.newPage(); // Fresh page for every scrape
  try {
    console.log(`   🔍 [${scraper.source}] Searching: "${keyword}"`);
    
    // Set a reasonable timeout for the whole scraper
    const result = await Promise.race([
      scraper.scrape(page, keyword),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 45000))
    ]) as any;

    if (result && result.price) {
      console.log(`   ✅ [${scraper.source}] Found: $${result.price}`);
      const { error } = await supabase.from("market_data").insert([{
        item_id,
        source: scraper.source,
        price: result.price,
        url: result.url,
        condition: result.condition || "New",
        title: result.title || null,
        image_url: result.image_url || null,
        created_at: new Date().toISOString()
      }]);
      if (error) console.error(`   ❌ [DB Error] ${error.message}`);
      return result.price;
    }
    return null;
  } catch (err: any) {
    console.error(`   ❌ [${scraper.source}] Error: ${err.message}`);
    return null;
  } finally {
    await page.close(); // ALWAYS close the page to free up RAM
  }
}

export async function main() {
  console.log("🚀 Starting Stabilized Scraper Runner...");
  const items = await getItemsToScrape();
  if (items.length === 0) return;

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'] // Vital for GitHub Actions memory
  });

  const context = await browser.newContext({ 
    userAgent: new UserAgent({ deviceCategory: 'desktop' }).toString() 
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
      await wait(2000, 5000); // Breathe between scrapers to avoid bot detection
    }

    if (count > 0) {
      const flipPrice = sum / count;
      await supabase.from("items").update({ 
        flip_price: flipPrice, 
        last_updated: new Date().toISOString() 
      }).eq("id", item.item_id);
    }
  }

  await browser.close();
  console.log("\n🏁 Market Scan Complete.");
}

main().then(() => process.exit(0)).catch(() => process.exit(1));
