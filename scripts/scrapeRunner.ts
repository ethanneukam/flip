import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { chromium, Browser, BrowserContext } from "playwright";
import { createClient } from "@supabase/supabase-js";
import UserAgent from "user-agents";
import { allScrapers } from "../scrapers";

// VERCEL FIX: Exporting the types that the individual scrapers need to import
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

const wait = (min = 1000, max = 3000) =>
  new Promise((res) => setTimeout(res, Math.random() * (max - min) + min));

async function getItemsToScrape(searchKeyword?: string) {
  if (searchKeyword) {
    console.log(`🎯 On-Demand Mode: Searching for "${searchKeyword}"`);
    
    // Upsert ensures the item exists in the 'items' table so we have a UUID
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
  const page = await context.newPage();
  try {
    console.log(`   🔍 [${scraper.source}] Searching: "${keyword}"`);
    
    const result = await Promise.race([
      scraper.scrape(page, keyword),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 45000))
    ]) as any;

    if (result && result.price) {
      console.log(`   ✅ [${scraper.source}] Found: $${result.price}`);

      // 1. LOG TO MARKET_DATA (For the real-time "Pulse" feed)
      await supabase.from("market_data").insert([{
        item_id,
        source: scraper.source,
        price: result.price,
        url: result.url,
        condition: result.condition || "New",
        title: result.title || null,
        image_url: result.image_url || null,
        created_at: new Date().toISOString()
      }]);

      // 2. LOG TO PRICE_LOGS (For the historical line graph)
      const { error: logError } = await supabase.from("price_logs").insert([{
        item_id,
        price: result.price,
        source: scraper.source,
        url: result.url
      }]);

      if (logError) console.error(`   ❌ [Log Error] ${logError.message}`);
      return result.price;
    }
    return null;
  } catch (err: any) {
    console.error(`   ❌ [${scraper.source}] Error: ${err.message}`);
    return null;
  } finally {
    await page.close();
  }
}

export async function main(searchKeyword?: string) {
  console.log("🚀 Starting Global Price Tracker...");
  
  const items = await getItemsToScrape(searchKeyword);
  if (items.length === 0) {
    console.log("⚠️ No items to process.");
    return;
  }

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'] 
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
      await wait(2000, 4000); 
    }

    if (count > 0) {
      const avgPrice = sum / count;
      console.log(`✨ Average Market Price: $${avgPrice.toFixed(2)}`);
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
main(manualKeyword)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
