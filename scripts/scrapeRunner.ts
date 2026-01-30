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
          // This saves REAL product names to the DB
          await supabase.from("items").upsert({
            title: result.title,
            ticker: result.title.substring(0, 8).toUpperCase().replace(/[^A-Z]/g, ''),
            flip_price: 0
          }, { onConflict: 'title' });
          
          // Log only the first 40 chars to keep logs clean
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
          event_type: 'PRICE_UPDATE',
          // Use item.title here. This was previously undefined!
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
                event_type: 'PRICE_ALERT',
                message: `🚨 ALERT: ${item.title} hit your target of $${alert.target_price}!`,
                metadata: { price: flip_price, ticker: item.ticker, alert_id: alert.id }
              }]);
              await supabase.from("price_alerts").update({ is_active: false }).eq("id", alert.id);
            }
          }
        }
      } else {
        // If no prices found, update timestamp so we don't scan it again immediately
        console.log(`⚠️ No data found for ${item.title}. Moving to back of queue.`);
        await supabase.from("items").update({ last_updated: new Date().toISOString() }).eq("id", item.item_id);
      }
    }
    if (i + BATCH_SIZE < items.length) await wait(10000, 20000); 
  }

  await browser.close();
  console.log("\n🏁 Market Scan Complete.");
}

async function getItemsToScrape(searchKeyword?: string) {
  console.log("📡 Oracle Pulse: Checking for unscanned nodes...");

  // 1. Manual Search Override
  if (searchKeyword && searchKeyword !== "undefined") {
    const { data: created } = await supabase.from("items").upsert({ 
      title: searchKeyword, 
      ticker: searchKeyword.substring(0, 5).toUpperCase(),
      flip_price: 0 
    }, { onConflict: 'title' }).select().single();
    return created ? [{ item_id: created.id, keyword: created.title, title: created.title, ticker: created.ticker }] : [];
  }

  // 2. Get items that haven't been priced yet
  let { data, error } = await supabase
    .from("items")
    .select("id, title, ticker")
    .or('flip_price.eq.0,flip_price.is.null')
    .order('created_at', { ascending: false })
    .limit(20);

  // 3. THE INFINITY FIX: 
  // If we have fewer than 5 items waiting, OR if the items we have are "dead ends" (like Hermes GPU),
  // we force the brain to generate more.
  if (!data || data.length < 5) { 
    console.log("🧠 Brain Triggered: Queue low. Injecting 20 fresh seeds...");
    const newBatch = [];
    for (let i = 0; i < 20; i++) {
      const title = generateAutonomousKeyword();
      newBatch.push({
        ticker: title.substring(0, 8).toUpperCase().replace(/\s/g, ''),
        title: title,
        flip_price: 0
      });
    }
    
    const { data: inserted } = await supabase.from("items").upsert(newBatch, { onConflict: 'title' }).select();
    data = [...(data || []), ...(inserted || [])];
  }

  console.log(`✅ Queueing ${data?.length} nodes for scanning.`);

  return data!.map((item: any) => ({ 
    item_id: item.id, 
    keyword: item.title, 
    title: item.title,   
    ticker: item.ticker 
  }));
}

if (require.main === module) {
  main(process.argv[2])
    .then(() => {
      console.log("✅ Process finished successfully");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Critical Error:", err);
      process.exit(1);
    });
}
