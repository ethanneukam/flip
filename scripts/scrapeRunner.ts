import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { chromium, Browser, Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import UserAgent from "user-agents";
import { allScrapers } from "../scrapers";

// Debug: Ensure ENV is loading
console.log("🛠️ Checking Environment...");
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) console.error("❌ Missing SUPABASE_URL");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ScraperResult {
  price: number;
  url: string;
  condition?: string;
  title?: string;
  image_url?: string | null;
  ticker?: string;
}

const wait = (min = 100, max = 400) =>
  new Promise((res) => setTimeout(res, Math.random() * (max - min) + min));

async function getItemsToScrape() {
  console.log("📡 Fetching items from database...");
  const { data, error } = await supabase.from("items").select("id, title");
  
  if (error) {
    console.error("❌ Database Error:", error.message);
    return [];
  }
  
  console.log(`📦 Found ${data?.length || 0} items to process.`);
  return data.map((item: any) => ({ item_id: item.id, keyword: item.title }));
}

async function runScraper({ page, scraper, item_id, keyword }: any) {
  try {
    console.log(`   🔍 Scraping ${scraper.source} for: "${keyword}"`);
    const result = await scraper.scrape(page, keyword);
    
    if (!result || !result.price) {
      console.log(`   ⚠️ No price found on ${scraper.source}`);
      return null;
    }

    console.log(`   ✅ Success! Found $${result.price} on ${scraper.source}`);

    const { error } = await supabase.from("market_data").insert([{
      item_id,
      source: scraper.source,
      price: result.price,
      url: result.url,
      condition: result.condition || "New",
      title: result.title || null,
      image_url: result.image_url || null,
      created_at: new Date().toISOString(),
    }]);

    if (error) console.error("   ❌ Insert Error:", error.message);

    return result;
  } catch (err: any) {
    console.error(`   ❌ Scraper Crash (${scraper.source}):`, err.message);
    return null;
  }
}

export async function main() {
  console.log("🚀 Starting Global Scrape Runner...");
  
  const items = await getItemsToScrape();
  if (items.length === 0) {
    console.log("⚠️ No items to scrape. Check your 'items' table.");
    return;
  }

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const context = await browser.newContext({ userAgent: new UserAgent().toString() });
  const page = await context.newPage();

  for (const item of items) {
    console.log(`\n--- Item: ${item.keyword} ---`);
    let sum = 0;
    let count = 0;

    for (const scraper of allScrapers) {
      const res = await runScraper({ page, scraper, item_id: item.item_id, keyword: item.keyword });
      if (res) {
        sum += res.price;
        count++;
      }
      await wait(1000, 2000);
    }

    if (count > 0) {
      const flipPrice = sum / count;
      console.log(`✨ Updating Flip Price: $${flipPrice.toFixed(2)}`);
      await supabase
        .from("items")
        .update({ flip_price: flipPrice, last_updated: new Date().toISOString() })
        .eq("id", item.item_id);
    }
  }

  await browser.close();
  console.log("\n🏁 Market Scan Complete.");
}

// Fixed execution block for tsx/esm
main().then(() => {
  console.log("✅ Script finished execution.");
  process.exit(0);
}).catch((err) => {
  console.error("💀 Script failed:", err);
  process.exit(1);
});
