process.on('unhandledRejection', (reason) => {
  console.error("________________________________________________");
  console.error("🚨 CRITICAL ERROR CAUGHT INSIDE SCRAPER 🚨");
  if (reason instanceof Error) {
    console.error(reason.stack);
  } else {
    // This fixes the [object Object] issue
    console.error(JSON.stringify(reason, null, 2));
  }
  console.error("________________________________________________");
  process.exit(1);
});

// Check Environment Variables immediately
const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = requiredVars.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error("❌ MISSING ENV VARS:", missing);
  process.exit(1);
}

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import http from "http"; // <--- ADD THIS LINE
import { chromium, BrowserContext, Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import UserAgent from "user-agents";
import { allScrapers } from "../scrapers/index.js";
import { gradeItemCondition } from "./aiGrader.js";
import { convertToUSD } from "./fxEngine.js";
import { Scraper, ScraperResult } from "../lib/scraper-types.js";
import fs from 'fs';
import readline from 'readline';

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


if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("❌ MISSING SUPABASE KEYS! Check your Render Environment Variables.");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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

async function* createSeedGenerator(shardId = 0) {
  const filePath = `./seeds-${shardId}.txt`;
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ SEED FILE MISSING: ${filePath} (Run "node seedFactory.js" first!)`);
    return;
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.trim()) yield line.trim();
  }
}

// 2. Start the generator instance immediately
const seedStream = createSeedGenerator(0); // Change '0' if using shards
async function applyStealthAndOptimization(page: Page) {
  const ua = new UserAgent({ deviceCategory: 'desktop' }).toString();
  await page.setExtraHTTPHeaders({
    'user-agent': ua,
    'referer': 'https://www.google.com/',
    'accept-language': 'en-US,en;q=0.9',
  });

  // BLOCKING IMAGES, FONTS, AND CSS TO SAVE RAM
  await page.route('**/*', (route) => {
    const url = route.request().url();
    const type = route.request().resourceType();
    const blockList = ['google-analytics', 'doubleclick', 'facebook.com', 'adsystem', 'amazon-adsystem', 'ads-twitter'];
    
    if (
      blockList.some(domain => url.includes(domain)) || 
      ['image', 'media', 'font', 'stylesheet', 'other'].includes(type)
    ) {
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
  if (!result.title || result.title.includes('Unknown') || result.title.length < 15) {
    continue;
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
  args: [
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-gpu',
    '--single-process', // Crucial: Keeps everything in one process
    '--disable-extensions',
    '--no-zygote',
    '--disable-setuid-sandbox',
    '--disable-accelerated-2d-canvas',
    '--proxy-server="direct://"',
    '--proxy-bypass-list=*',
    '--js-flags="--max-old-space-size=128"' // Limits V8 engine memory
  ]
})

  const context = await browser.newContext();
  const BATCH_SIZE = 1;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Processing Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} items)`);

for (const item of batch) {
  console.log(`\n--- Market Scan: ${item.title} ---`);

  // 1. DO THE SANITY CHECK FIRST
  // This saves RAM because we don't launch the browser if the item is fake!
  const sanityCheck = await gradeItemCondition(item.title);
  if (!sanityCheck.is_real) {
    console.log(`🗑️ Skipping "${item.title}": Marked as Hallucination by AI.`);
    await supabase.from("items").delete().eq("id", item.item_id);
    continue; 
  }

  let browser = null;

  try {
    // 2. NOW LAUNCH THE BROWSER
    browser = await chromium.launch({
      args: [ 
        '--disable-dev-shm-usage', '--no-sandbox', '--disable-gpu', 
        '--single-process', '--no-zygote', '--no-first-run',
        '--js-flags="--max-old-space-size=128"' 
      ]
    });
    
    const context = await browser.newContext();
    let allPrices: number[] = [];

    // 3. EXECUTE NODES
    for (const node of GLOBAL_NODES) {
      console.log(`  🌍 Node: ${node.region}`);
      for (const scraper of allScrapers) {
        if (!node.platforms.includes(scraper.source)) continue;

        const pricesFromSource = await runScraper(context, scraper, item.item_id, item.keyword, node.tld, node.region);
        
        if (pricesFromSource?.length > 0) {
          for (const p of pricesFromSource) {
            const convertedPrice = await convertToUSD(p, node.currency);
            const landedPrice = calculateLandedCost(convertedPrice, node.region);
            allPrices.push(landedPrice);
          }
        }
        await wait(1500, 3000); 
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

  } catch (err) {
    console.error("❌ Batch Item Error:", err.message);
  } finally {
    // 5. THE FAIL-SAFE: ALWAYS CLOSE
    if (browser) {
      await browser.close(); 
      console.log("🧹 RAM Purged. Browser Process Killed.");
    }
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
// --- REPLACEMENT START ---
  
  // 1. Pull the next 15 lines from our massive file
  const nextSeeds: string[] = [];
  
  for (let i = 0; i < 15; i++) {
    const { value, done } = await seedStream.next();
    if (done) {
      console.log("🏁 Seed file exhausted! Restarting scraper or shutting down...");
      break; // You might want to process.exit(0) here or restart the loop
    }
    if (value) nextSeeds.push(value);
  }

  // 2. Map file seeds to your database structure
  const seeds = nextSeeds.map(title => ({
    title: title,
    ticker: generateUniqueTicker(title), // Keep your existing ticker logic
    flip_price: 0,
    last_updated: new Date().toISOString()
  }));

  // --- REPLACEMENT END ---

  // ... (Keep your existing Supabase code below exactly as is) ...
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
// ... (All the code above remains the same)

// --- REPLACED BOTTOM BLOCK ---

// We export this function so start.js can trigger it
export async function startScraperLoop(shardId = 0) {
  const seedGenerator = getSeedGenerator(shardId);

  while (true) {
    let browser = null; // Declare it here!

    try {
      const { value: currentSeed, done } = await seedGenerator.next();
      if (done) break;

      // Launch with the "Low RAM" flags we discussed
      browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--single-process', // This is the big memory saver
          '--disable-gpu',
          '--no-zygote'
        ],
      });

      const context = await browser.newContext();
      // ... your scraping logic here ...
      
    } catch (error) {
      console.error("❌ Scraper encountered an issue:", error.message);
    } finally {
      // Check if browser exists before trying to close it
      if (browser) {
        await browser.close();
        console.log("🧹 Browser closed to free up RAM.");
      }
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
try {
  await runScraper(currentSeed);
} catch (error) {
  console.error("❌ Scraper encountered an issue");
} finally {
  // CRITICAL: Ensure the browser closes even if the scrape fails/times out
  if (browser) await browser.close(); 
}
// Keep this for local testing (node scripts/scrapeRunner.ts)
const isMain = process.argv[1] && process.argv[1].includes('scrapeRunner');
if (isMain) {
    startScraperLoop();
}
