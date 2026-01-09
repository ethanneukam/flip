import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { chromium, BrowserContext, Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import UserAgent from "user-agents";
import { allScrapers } from "../scrapers";

// EXPORTED TYPES FOR VERCEL COMPATIBILITY
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
  scrape: (page: any, keyword: string) => Promise<ScraperResult[] | null>;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
// Add this helper function at the top of scrapeRunner.ts
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  
  // 1. Sort the prices
  const sorted = values.sort((a, b) => a - b);
  
  // 2. Remove extreme outliers (top 10% and bottom 10%) if we have enough data
  let validPrices = sorted;
  if (sorted.length > 5) {
    const removeCount = Math.floor(sorted.length * 0.1);
    validPrices = sorted.slice(removeCount, sorted.length - removeCount);
  }

  // 3. Find the middle value
  const mid = Math.floor(validPrices.length / 2);
  return validPrices.length % 2 !== 0
    ? validPrices[mid]
    : (validPrices[mid - 1] + validPrices[mid]) / 2;
}

// ... inside your main loop, REPLACE the old price calculation with this:

    // --- AGGREGATE DATA ---
    let allPrices: number[] = [];
    
    // Combine all found prices into one array
    Object.values(results).forEach((r: any) => {
      if (r && r.prices && r.prices.length > 0) {
        allPrices = [...allPrices, ...r.prices];
      }
    });

    // Filter out "zero" or "negative" prices
    allPrices = allPrices.filter(p => p > 0);

    console.log(`📊 Found ${allPrices.length} total valid prices across all sources.`);

    let marketPrice = 0;
    if (allPrices.length > 0) {
      // Use Median instead of Average to kill the $15 Sextillion bug
      marketPrice = calculateMedian(allPrices);
      console.log(`✨ FINAL MEDIAN PRICE: $${marketPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
      
      // Update Supabase
      const { error: updateError } = await supabase
        .from("items")
        .update({ 
          flip_price: marketPrice,
          last_updated: new Date().toISOString()
        })
        .eq("id", item.item_id);

      if (updateError) console.error(`❌ Failed to update Supabase: ${updateError.message}`);
      else console.log(`💾 Saved $${marketPrice.toFixed(2)} to database.`);
    } else {
      console.log("⚠️ No valid prices found. Skipping database update.");
    }
/**
 * Enhanced Stealth: Prevents detection by rotating fingerprints
 */
async function applyStealthAndOptimization(page: Page) {
  const ua = new UserAgent({ deviceCategory: 'desktop' }).toString();
  
  await page.setExtraHTTPHeaders({
    'user-agent': ua,
    'referer': 'https://www.google.com/',
    'accept-language': 'en-US,en;q=0.9',
  });

  await page.route('**/*', (route) => {
    const url = route.request().url();
    const type = route.request().resourceType();
    
    const blockList = [
      'google-analytics', 'doubleclick', 'facebook.com', 
      'adsystem', 'amazon-adsystem', 'ads-twitter'
    ];

    if (
      blockList.some(domain => url.includes(domain)) ||
      ['image', 'media', 'font', 'stylesheet'].includes(type)
    ) {
      return route.abort();
    }
    route.continue();
  });
}

const wait = (min = 1500, max = 4000) =>
  new Promise((res) => setTimeout(res, Math.random() * (max - min) + min));

/**
 * runScraper handles an ARRAY of ScraperResults
 */
async function runScraper(context: BrowserContext, scraper: any, item_id: string, keyword: string) {
  const page = await context.newPage();
  await applyStealthAndOptimization(page);

  page.setDefaultTimeout(30000); 

  try {
    console.log(`    🔍 [${scraper.source}] Initializing: "${keyword}"`);
    await wait(1000, 2000);

    const results = await Promise.race([
      scraper.scrape(page, keyword),
      new Promise((_, reject) => setTimeout(() => reject(new Error("ORACLE_TIMEOUT")), 50000))
    ]) as ScraperResult[] | null;

    if (results && results.length > 0) {
      console.log(`    ✅ [${scraper.source}] Found ${results.length} items.`);

      let validPrices: number[] = [];

      for (const result of results) {
        if (!result.price || isNaN(result.price)) continue;
        validPrices.push(result.price);

        const payload = {
          item_id,
          source: scraper.source,
          price: result.price,
          url: result.url,
          condition: result.condition || "New",
          title: result.title || null,
          image_url: result.image_url || null
        };

        // Insert into market_data and price_logs
        await Promise.all([
          supabase.from("market_data").insert([payload]),
          supabase.from("price_logs").insert([{ 
            item_id, 
            price: result.price, 
            source: scraper.source, 
            url: result.url 
          }])
        ]);
      }

      return validPrices.length > 0 
        ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length 
        : null;
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
  console.log("🚀 Starting Market Oracle...");
  const items = await getItemsToScrape(searchKeyword);
  
  if (items.length === 0) {
    console.log("⚠️ No items found to scrape. Check your 'items' table in Supabase.");
    return;
  }

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] 
  });

  const context = await browser.newContext();

  const BATCH_SIZE = 5;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Processing Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} items)`);

    for (const item of batch) {
      console.log(`\n--- Market Scan: ${item.keyword} ---`);
      let sourceAverages: number[] = [];

      for (const scraper of allScrapers) {
        const avgPriceFromSource = await runScraper(context, scraper, item.item_id, item.keyword);
        if (avgPriceFromSource) sourceAverages.push(avgPriceFromSource);
        await wait(2000, 4000); 
      }

      if (sourceAverages.length > 0) {
        const globalAvgPrice = sourceAverages.reduce((a, b) => a + b, 0) / sourceAverages.length;
        console.log(`✨ FINAL MARKET PRICE: $${globalAvgPrice.toFixed(2)}`);
        
        await supabase.from("items").update({ 
          flip_price: globalAvgPrice, 
          last_updated: new Date().toISOString() 
        }).eq("id", item.item_id);
      }
    }

    if (i + BATCH_SIZE < items.length) {
      console.log(`\n⏳ Cooling down between batches...`);
      await wait(10000, 20000); 
    }
  }

  await browser.close();
  console.log("\n🏁 Market Scan Complete.");
}

async function getItemsToScrape(searchKeyword?: string) {
  console.log("📡 Connecting to Supabase 'items' table...");

  if (searchKeyword && searchKeyword !== "undefined") {
    const { data: existing } = await supabase.from("items").select("id, title").eq("title", searchKeyword).single();
    if (existing) return [{ item_id: existing.id, keyword: existing.title }];

    const { data: created } = await supabase.from("items").insert({ title: searchKeyword }).select().single();
    return created ? [{ item_id: created.id, keyword: created.title }] : [];
  }
  
  // Removed .order('last_updated') because the column doesn't exist
  const { data, error } = await supabase
    .from("items")
    .select("id, title")
    .limit(50);
    
  if (error) {
    console.error("❌ Supabase Error:", error.message);
    return [];
  }

  if (!data || data.length === 0) {
    console.log("❓ Supabase returned 0 rows. Double check your 'items' table data.");
    return [];
  }

  console.log(`✅ Found ${data.length} items. Starting scan...`);
  console.table(data); // This will show up in your GitHub Action logs
    
  return data.map((item: any) => ({ 
    item_id: item.id, 
    keyword: item.title 
  }));
}

// Ensure the process handles the promise and exits correctly
main(process.argv[2])
  .then(() => {
    console.log("✅ Process finished successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Critical Error:", err);
    process.exit(1);
  });
