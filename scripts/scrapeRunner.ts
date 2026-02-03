import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { chromium, BrowserContext, Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import UserAgent from "user-agents";
import { allScrapers } from "../scrapers";

// EXPANDED CATEGORIES FOR BETTER SEEDS
const BRANDS = ["Apple", "Sony", "Nvidia", "Nike", "Dyson", "Samsung", "Rolex", "Nintendo", "Lego", "KitchenAid", "DeWalt", "Canon", "ASUS", "MSI", "Patagonia", "Lululemon", "Tesla", "DJI", "Bose", "Peloton", "YETI", "Hermes", "Prada", "Casio"];
const CATEGORIES = ["Smartphone", "Gaming Laptop", "GPU", "Wireless Headphones", "Smartwatch", "4K Monitor", "Sneakers", "Coffee Maker", "Power Station", "Mechanical Keyboard", "Mirrorless Camera", "Electric Scooter", "Drone", "Handbag", "Electric Guitar", "Camping Tent", "Power Drill", "Action Camera", "Skincare Set"];
const MODIFIERS = ["Pro", "Ultra", "Series 5", "V2", "Edition", "Wireless", "OLED", "Titanium", "Limited", "Gen 3", "Special", "Professional", "Compact", "Portable"];

function generateAutonomousKeyword(): string {
  const b = BRANDS[Math.floor(Math.random() * BRANDS.length)];
  const c = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const m = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
  return `${b} ${c} ${m}`;
}

function generateUniqueTicker(title: string): string {
  const base = title.substring(0, 5).toUpperCase().replace(/[^A-Z]/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${base}-${randomSuffix}`; // Result: APPLE-XJ3
}

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

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  let validPrices = sorted;
  if (sorted.length > 5) {
    const removeCount = Math.floor(sorted.length * 0.1);
    validPrices = sorted.slice(removeCount, sorted.length - removeCount);
  }
  const mid = Math.floor(validPrices.length / 2);
  return validPrices.length % 2 !== 0
    ? validPrices[mid]
    : (validPrices[mid - 1] + validPrices[mid]) / 2;
}

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
    const blockList = ['google-analytics', 'doubleclick', 'facebook.com', 'adsystem', 'amazon-adsystem', 'ads-twitter'];
    if (blockList.some(domain => url.includes(domain)) || ['image', 'media', 'font', 'stylesheet'].includes(type)) {
      return route.abort();
    }
    route.continue();
  });
}

const wait = (min = 1500, max = 4000) => new Promise((res) => setTimeout(res, Math.random() * (max - min) + min));

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

        // --- IMPROVED HARVESTER ---
 if (result.title && result.title.length > 10) {
  await supabase.from("items").upsert({
    title: result.title,
    ticker: generateUniqueTicker(result.title), // Ensure uniqueness here too
    flip_price: 0
  }, { 
    onConflict: 'ticker', // Now we conflict on the ticker restriction
    ignoreDuplicates: true  // If ticker exists, just skip this one
  });
  
  console.log(`🌱 Harvested: ${result.title.slice(0, 40)}...`);
}

        const { error: logError } = await supabase.from("price_logs").insert([{ 
          item_id, 
          price: result.price, 
          source: scraper.source, 
          url: result.url 
        }]);
        if (logError) console.error(`    ⚠️ [${scraper.source}] Logging Error: ${logError.message}`);
      }

      // --- 🕸️ RELATED ITEMS DEEP EXPANSION 🕸️ ---
      // This scans the current page for "Related Items" or "Customers Also Bought" links
      try {
        const relatedLinks = await page.$$eval('a', (anchors: any[]) => 
          anchors
            .map(a => ({ text: a.innerText, href: a.href }))
            .filter(a => a.text.length > 15 && a.text.length < 100 && (a.href.includes('/dp/') || a.href.includes('/product/') || a.href.includes('/ip/')))
            .slice(0, 4) // Grab 4 related items per scan to grow network
        );

        if (relatedLinks.length > 0) {
           console.log(`    🕸️ Web Expansion: Found ${relatedLinks.length} related items.`);
           const relatedSeeds = relatedLinks.map(link => ({
              title: link.text.trim(),
              ticker: link.text.trim().substring(0, 8).toUpperCase().replace(/[^A-Z]/g, ''),
              flip_price: 0,
              last_updated: new Date().toISOString()
           }));

           // Feed these back into the Brain
           await supabase.from("items").upsert(relatedSeeds, { onConflict: 'title' });
        }
      } catch (relatedErr) {
          // Silently fail on related items so we don't crash the main price check
      }
      // ---------------------------------------------

      return validPrices; 
    }
    return [];
  } catch (err: any) {
    console.error(`    ❌ [${scraper.source}] Error: ${err.message}`);
    return [];
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
      console.log(`\n--- Market Scan: ${item.title} ---`); // Use title for logs
       
      let allPrices: number[] = [];

      for (const scraper of allScrapers) {
        // Use 'keyword' for scraping (what we type into Amazon)
        const pricesFromSource = await runScraper(context, scraper, item.item_id, item.keyword);
        if (pricesFromSource.length > 0) {
          allPrices = [...allPrices, ...pricesFromSource];
        }
        await wait(2000, 4000); 
      }

     if (allPrices.length > 0) {
        const flip_price = calculateMedian(allPrices);
        console.log(`✨ FINAL MARKET PRICE: $${flip_price.toFixed(2)} (${allPrices.length} data points)`);
        
        // 1. Update the items table
        await supabase.from("items").update({ 
          flip_price: flip_price, 
          last_updated: new Date().toISOString() 
        }).eq("id", item.item_id);

        // 2. Log to the Pulse Feed (WITH ERROR CHECKING)
        const { error: feedError } = await supabase.from("feed_events").insert([{
          item_id: item.item_id,
          type: 'PRICE_UPDATE',
          title: `Price Update: ${item.ticker || 'ASSET'}`, // <--- ADD THIS LINE
          message: `Oracle updated ${item.title} to $${flip_price.toFixed(2)}`,
          metadata: { 
            price: flip_price, 
            ticker: item.ticker || "ASSET",
            item_id: item.item_id 
          }
        }]);

        if (feedError) {
            console.error("❌ Feed Insert Error:", feedError.message);
        } else {
            console.log("✅ Feed Event Published.");
        }

        // 3. Check Alerts
        const { data: alerts } = await supabase
          .from("price_alerts")
          .select("*")
          .eq("item_id", item.item_id)
          .eq("is_active", true);

        if (alerts && alerts.length > 0) {
          for (const alert of alerts) {
            const isTriggered = 
              (alert.condition === 'below' && flip_price <= alert.target_price) ||
              (alert.condition === 'above' && flip_price >= alert.target_price);

            if (isTriggered) {
              console.log(`🎯 ALERT TRIGGERED for User ${alert.user_id}`);
              await supabase.from("feed_events").insert([{
                user_id: alert.user_id,
                item_id: item.item_id,
                type: 'PRICE_ALERT',
                title: `🚨 Price Target Hit!`, // <--- ADD THIS LINE
                message: `🚨 ALERT: ${item.title} hit your target of $${alert.target_price}!`,
                metadata: { price: flip_price, ticker: item.ticker, alert_id: alert.id }
              }]);
              await supabase.from("price_alerts").update({ is_active: false }).eq("id", alert.id);
            }
          }
        }
      } else {
        // If no prices found, update timestamp so we don't scan it again immediately
       console.log(`🗑️ No market data found for "${item.title}". Removing ghost node.`);
        await supabase.from("items").delete().eq("id", item.item_id);
      }
    }
    if (i + BATCH_SIZE < items.length) await wait(10000, 20000); 
  }

  await browser.close();
  console.log("\n🏁 Market Scan Complete.");
}

async function getItemsToScrape(searchKeyword?: string) {
  console.log("📡 Oracle Pulse: Checking for unscanned nodes...");

  // 1. Manual Search Priority
  if (searchKeyword && searchKeyword !== "undefined") {
    const { data: created, error: manualError } = await supabase.from("items").upsert({ 
      title: searchKeyword, 
      ticker: searchKeyword.substring(0, 5).toUpperCase(),
      flip_price: 0 
    }, { onConflict: 'title' }).select().single();
    
    if (manualError) console.error("❌ Manual Search Error:", manualError.message);
    if (created) return [{ item_id: created.id, keyword: created.title, title: created.title, ticker: created.ticker }];
  }

  // 2. Fetch existing items
  let { data: existingData } = await supabase
    .from("items")
    .select("id, title, ticker")
    .or('flip_price.eq.0,flip_price.is.null')
    .limit(10);

  // 3. Brain Generation
  console.log("🧠 Brain Triggered: Generating fresh seeds...");
const seeds = Array.from({ length: 15 }).map(() => {
  const title = generateAutonomousKeyword();
  return {
    title,
    ticker: generateUniqueTicker(title), // Uses the new unique generator
    flip_price: 0,
    last_updated: new Date().toISOString()
  };
});
  // 4. Force save seeds (WITH ERROR LOGGING)
  const { data: insertedData, error: seedError } = await supabase
    .from("items")
    .upsert(seeds, { onConflict: 'title' })
    .select();

  if (seedError) {
    console.error("❌ BRAIN ERROR (Database Rejected Seeds):", seedError.message);
    // CRITICAL FALLBACK: If DB fails, use a fake ID so the scraper can still run
    // This keeps the loop alive even if the DB is acting up
    console.log("⚠️ Switching to In-Memory Mode for this batch.");
    const fallbackQueue = seeds.slice(0, 5).map(s => ({
      item_id: "temp-" + Math.random(), 
      keyword: s.title,
      title: s.title,
      ticker: s.ticker
    }));
    return fallbackQueue;
  }

  // Combine real database items
  const pool = [...(existingData || []), ...(insertedData || [])];
   
  const finalQueue = pool
    .filter(item => item && item.id) 
    .sort(() => 0.5 - Math.random())
    .slice(0, 10);

  console.log(`✅ Queueing ${finalQueue.length} nodes with valid UUIDs.`);
   
  // MAP correctly
  return finalQueue.map(item => ({
    item_id: item.id,
    keyword: item.title,
    title: item.title,
    ticker: item.ticker
  }));
}

// DELETE the old single-run block and REPLACE it with this:
if (require.main === module) {
  (async () => {
    console.log("♾️ Market Oracle: Infinite Mode Activated");
    while (true) {
      try {
        // We pass the search keyword from the command line if it exists
        await main(process.argv[2]); 
        
        console.log("⏳ Batch complete. Resting for 30 seconds...");
        await wait(30000, 30000); 
      } catch (e) {
        console.error("❌ Loop Error:", e);
        await wait(5000, 5000); // Short wait before retrying on error
      }
    }
  })();
}
