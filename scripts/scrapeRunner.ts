import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import http from "http"; // <--- ADD THIS LINE
import { chromium, BrowserContext, Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import UserAgent from "user-agents";
import { allScrapers } from "../scrapers/index.js";
import { gradeItemCondition } from "./aiGrader.js";
import { convertToUSD } from "./fxEngine.js";

// EXPANDED CATEGORIES FOR BETTER SEEDS
const BRANDS = ["Apple", "Sony", "Nvidia", "Nike", "Dyson", "Samsung", "Rolex", "Nintendo", "Lego", "KitchenAid", "DeWalt", "Canon", "ASUS", "MSI", "Patagonia", "Lululemon", "Tesla", "DJI", "Bose", "Peloton", "YETI", "Hermes", "Prada", "Casio"];
const CATEGORIES = ["Smartphone", "Gaming Laptop", "GPU", "Wireless Headphones", "Smartwatch", "4K Monitor", "Sneakers", "Coffee Maker", "Power Station", "Mechanical Keyboard", "Mirrorless Camera", "Electric Scooter", "Drone", "Handbag", "Electric Guitar", "Camping Tent", "Power Drill", "Action Camera", "Skincare Set"];
const MODIFIERS = ["Pro", "Ultra", "Series 5", "V2", "Edition", "Wireless", "OLED", "Titanium", "Limited", "Gen 3", "Special", "Professional", "Compact", "Portable"];

const GLOBAL_NODES = [
  { region: 'US', tld: '.com', currency: 'USD', platforms: ['Amazon', 'eBay', 'StockX', 'Walmart', 'Goat'] },
  { region: 'JP', tld: '.co.jp', currency: 'JPY', platforms: ['Amazon', 'Mercari', 'YahooJP', 'Rakuten'] },
  { region: 'UK', tld: '.co.uk', currency: 'GBP', platforms: ['Amazon', 'eBay', 'Depop'] },
  { region: 'EU', tld: '.de', currency: 'EUR', platforms: ['Amazon', 'eBay', 'Grailed'] },
  { region: 'AU', tld: '.com.au', currency: 'AUD', platforms: ['Amazon', 'eBay'] }
];

function generateAutonomousKeyword(): string {
  const b = BRANDS[Math.floor(Math.random() * BRANDS.length)];
  const c = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const m = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
  return `${b} ${c} ${m}`;
}

function calculateLandedCost(basePriceUsd: number, originRegion: string): number {
  if (originRegion === 'US') return basePriceUsd;

  let dutyMultiplier = 1.0;
  let flatShipping = 0;

  switch (originRegion) {
    case 'JP':
      dutyMultiplier = 1.10; // 10% Import Duty
      flatShipping = 65;     // DHL Express from Tokyo
      break;
    case 'UK':
    case 'EU':
      dutyMultiplier = 1.05; // 5% Duty
      flatShipping = 45;     // Transatlantic Priority
      break;
    case 'AU':
      dutyMultiplier = 1.05;
      flatShipping = 55;
      break;
  }

  // Formula: (Price * Duty) + Shipping
  return (basePriceUsd * dutyMultiplier) + flatShipping;
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
  scrape: (page: any, keyword: string, tld?: string) => Promise<ScraperResult[] | null>;
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

async function runScraper(context: BrowserContext, scraper: any, item_id: string, keyword: string, tld: string = ".com", region: string = "US") {
  const page = await context.newPage();
  await applyStealthAndOptimization(page);
  page.setDefaultTimeout(30000); 

  try {
    // UPDATE THIS LINE: Log the region and TLD
    console.log(`    🔍 [${scraper.source} ${region}] Initializing: "${keyword}" on ${tld}`);
    await wait(1000, 2000);

    const results = await Promise.race([
      // UPDATE THIS LINE: Pass tld to the scraper
      scraper.scrape(page, keyword, tld), 
      new Promise((_, reject) => setTimeout(() => reject(new Error("ORACLE_TIMEOUT")), 50000))
    ]) as ScraperResult[] | null;

    if (results && results.length > 0) {
      console.log(`    ✅ [${scraper.source}] Found ${results.length} items.`);
      let validPrices: number[] = [];

      for (const result of results) {
        if (!result.price || isNaN(result.price)) continue;
        validPrices.push(result.price);

        // --- IMPROVED HARVESTER ---
// --- IMPROVED HARVESTER (WITH AI BRAIN) ---
        if (result.title && result.title.length > 10) {
          
          // 🧠 ASK THE AI FOR A GRADE
          console.log(`    🧠 Grading: ${result.title.substring(0, 30)}...`);
          // Note: Passing result.condition (if it exists) helps the AI, otherwise it uses the title
          const grading = await gradeItemCondition(result.title, result.condition || "");
       
          // 💾 SAVE TO SUPABASE WITH THE NEW DATA
          const { error } = await supabase.from("items").upsert({
            title: result.title,
            // Use result.ticker if the scraper found one, otherwise generate it
            ticker: result.ticker || generateUniqueTicker(result.title), 
            flip_price: result.price, // Initialize with the found price
            condition_grade: grading.grade,
            condition_score: grading.score,
            ai_notes: grading.notes
          }, { 
            onConflict: 'ticker',
            ignoreDuplicates: true 
          });
       
          if (!error) {
            console.log(`    ✨ Rated [${grading.grade}] - ${grading.notes}`);
          } else {
             // Optional: Log error if needed, but usually we ignore dups
             // console.error(error.message);
          }
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

      for (const node of GLOBAL_NODES) {
        console.log(`  🌍 Switching to Node: ${node.region} (${node.currency})`);
        
        for (const scraper of allScrapers) {
          // Only run if the platform is relevant for this country node
          if (!node.platforms.includes(scraper.source)) continue;

          const pricesFromSource = await runScraper(context, scraper, item.item_id, item.keyword, node.tld, node.region);
          
          if (pricesFromSource && pricesFromSource.length > 0) {
            for (const p of pricesFromSource) {
              // Convert to USD and apply Landed Cost (Shipping/Duty)
              const convertedPrice = await convertToUSD(p, node.currency);
              const landedPrice = calculateLandedCost(convertedPrice, node.region);
              allPrices.push(landedPrice);
            }
          }
          await wait(2000, 4000); 
        }
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
async function runGlobalMarketScan(item: any, context: BrowserContext) {
  for (const node of GLOBAL_NODES) {
    console.log(`🌍 Node Triggered: ${node.region} (${node.currency})`);
    
    for (const scraper of allScrapers) {
      if (!node.platforms.includes(scraper.source)) continue;

      // Open a new page for this node scan
      const page = await context.newPage();
      await applyStealthAndOptimization(page);

      try {
        // Now passing 3 arguments: page, keyword, and tld
        const results = await scraper.scrape(page, item.keyword, node.tld);
        
        if (results) {
          for (const res of results) {
            const usdPrice = await convertToUSD(res.price, node.currency);
            const landedPrice = calculateLandedCost(usdPrice, node.region);

            await supabase.from("price_logs").insert({
              item_id: item.id,
              price: landedPrice,
              local_price: res.price,
              currency: node.currency,
              region: node.region,
              url: res.url,
              source: scraper.source
            });
          }
        }
      } catch (err) {
        console.error(`❌ [${scraper.source}] Node Scan Error:`, err);
      } finally {
        await page.close();
      }
    }
  }
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

// REPLACE the bottom block with this:
// --- ESM COMPATIBLE BOOTSTRAP ---
const isMain = process.argv[1].includes('scrapeRunner');

if (isMain) {
  // 1. START HEARTBEAT SERVER
  const PORT = Number(process.env.PORT) || 10000;

  http.createServer((req, res) => {
    console.log(`Ping received at ${new Date().toISOString()}`);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ALIVE');
  }).listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Heartbeat Monitoring active on port ${PORT}`);
  });

  // 2. START INFINITE SCRAPER LOOP
  (async () => {
    console.log("♾️ Market Oracle: Infinite Mode Activated");
    while (true) {
      try {
        await main(process.argv[2]); 
        
        console.log("⏳ Batch complete. Resting for 30 seconds...");
        await new Promise(res => setTimeout(res, 30000)); 
      } catch (e) {
        console.error("❌ Loop Error:", e);
        await new Promise(res => setTimeout(res, 5000));
      }
    }
  })();
}
