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
const BRANDS = [
  "Apple", "Sony", "Nvidia", "Nike", "Dyson", "Samsung", "Rolex", "Nintendo", 
  "Lego", "KitchenAid", "DeWalt", "Canon", "ASUS", "MSI", "Patagonia", 
  "Lululemon", "Tesla", "DJI", "Bose", "Peloton", "YETI", "Hermes", "Prada", 
  "Casio", "Fujifilm", "Sonos", "Milwaukee", "Theragun", "Breville", "Steelcase"
];

const CATEGORIES = [
  "Smartphone", "Gaming Laptop", "GPU", "Wireless Headphones", "Smartwatch", 
  "4K Monitor", "Sneakers", "Coffee Maker", "Power Station", "Mechanical Keyboard", 
  "Mirrorless Camera", "Electric Scooter", "Drone", "Handbag", "Electric Guitar", 
  "Camping Tent", "Power Drill", "Action Camera", "Skincare Set", "VR Headset", 
  "E-Reader", "Projector", "Soundbar", "Ergonomic Chair", "Massage Gun"
];

const MODIFIERS = [
  "Pro", "Ultra", "Series 5", "V2", "Edition", "Wireless", "OLED", "Titanium", 
  "Limited", "Gen 3", "Special", "Professional", "Compact", "Portable", "M3", 
  "MagSafe", "Noise Cancelling", "Refurbished", "Used", "Factory Sealed"
];

const GLOBAL_NODES = [
  { region: 'US', tld: '.com', currency: 'USD', platforms: ['Amazon', 'eBay', 'StockX', 'Walmart', 'Goat'] },
  //{ region: 'JP', tld: '.co.jp', currency: 'JPY', platforms: ['Amazon', 'Mercari', 'YahooJP', 'Rakuten'] },
  //{ region: 'UK', tld: '.co.uk', currency: 'GBP', platforms: ['Amazon', 'eBay', 'Depop'] },
 // { region: 'EU', tld: '.de', currency: 'EUR', platforms: ['Amazon', 'eBay', 'Grailed'] },
 // { region: 'AU', tld: '.com.au', currency: 'AUD', platforms: ['Amazon', 'eBay'] }
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
  page.setDefaultTimeout(40000); 

  try {
    console.log(`🔍 [${scraper.source} ${region}] Initializing: "${keyword}" on ${tld}`);
    
    const results = await Promise.race([
      scraper.scrape(page, keyword, tld), 
      new Promise((_, reject) => setTimeout(() => reject(new Error("ORACLE_TIMEOUT")), 60000))
    ]) as ScraperResult[] | null;

    let validPrices: number[] = [];

    if (results && results.length > 0) {
      console.log(`✅ [${scraper.source}] Found ${results.length} items.`);
      
      for (const result of results) {
        if (!result.title || result.title.includes('Unknown') || result.title.length < 8) continue; 
        validPrices.push(result.price);

        await supabase.from("price_logs").insert([{ 
          item_id, 
          price: result.price, 
          source: scraper.source, 
          url: result.url || ''
        }]);
      }
    }

    // --- 🕸️ WEB EXPANSION ---
    try {
      const relatedLinks = await page.$$eval('a', (anchors: any[]) => 
        anchors
          .map(a => ({ text: a.innerText, href: a.href }))
          .filter(a => a.text.length > 15 && a.href.includes('/dp/')) 
          .slice(0, 2)
      );

      if (relatedLinks.length > 0) {
         const relatedSeeds = relatedLinks.map(link => ({
            title: link.text.trim(),
            ticker: link.text.trim().substring(0, 8).toUpperCase().replace(/[^A-Z]/g, ''),
            flip_price: 0,
            last_updated: new Date(0).toISOString()
         }));
         await supabase.from("items").upsert(relatedSeeds, { onConflict: 'title' });
      }
    } catch (e) {}

    return validPrices; 
  } catch (err: any) {
    console.error(`❌ [${scraper.source}] Error: ${err.message}`);
    return [];
  } finally {
    await page.close(); // FIX: Use lowercase 'page', not 'Page'
  }
}
export async function main(searchKeyword?: string) {
  console.log("🚀 Starting Market Oracle...");
  const items = await getItemsToScrape(searchKeyword);
   
  if (!items || items.length === 0) return;

  // --- 1. BATCH AUTHENTICATION (The Token Saver) ---
  console.log(`🧠 Authenticating batch of ${items.length} items...`);
  // Note: Ensure your aiGrader.ts exports 'gradeBatch' as we discussed
 const gradedBatch = await gradeItemCondition(items.map(i => ({ title: i.title, id: i.item_id })));

  for (const item of items) {
    // FIX: Match the variable name to the search result
    const itemGrading = gradedBatch.find((g: any) => g.title === item.title);
    
    // If AI says it's fake and it's NOT a system error, skip it
    if (itemGrading && !itemGrading.is_real && !itemGrading.error) {
      console.log(`🗑️ Hallucination Filter: Skipping "${item.title}"`);
      await supabase.from("items").update({ last_updated: new Date().toISOString() }).eq("id", item.item_id);
      continue;
    }

    console.log(`\n--- Market Scan: ${item.title} ---`);
    let itemPrices: number[] = [];

    // 2. Cycle through Regions (Nodes)
    for (const node of GLOBAL_NODES) {
      console.log(`  🌍 Node: ${node.region}`);

      // 3. Cycle through Scrapers (Amazon, eBay, etc)
      for (const scraper of allScrapers) {
        if (!node.platforms.includes(scraper.source)) continue;

        let browser = null;
        try {
          // LAUNCH BROWSER (One instance per source to prevent memory leaks)
          browser = await chromium.launch({
            headless: true,
  args: [
    // --- MEMORY & STABILITY ---
    '--disable-dev-shm-usage',     // Uses /tmp instead of /dev/shm (essential for Docker/Render)
    '--no-sandbox',                // Disables the security sandbox (required for many cloud hosts)
    '--disable-setuid-sandbox',    // Additional sandbox disable
    '--single-process',            // Forces everything into one process (massive RAM saver)
    '--no-zygote',                 // Disables the "forking" process manager
    '--js-flags="--max-old-space-size=128"', // Limits V8 engine memory

    // --- STRIP UI & FEATURES ---
    '--disable-gpu',               // No hardware acceleration
    '--disable-canvas-aa',         // Disable antialiasing on canvas
    '--disable-2d-canvas-clip-utils',
    '--disable-gl-drawing-for-tests',
    '--disable-extensions',        // No extensions
    '--no-first-run',              // Skip first-run tasks
    '--no-default-browser-check',  // Skip default browser check
    '--disable-default-apps',      // No default apps (Google Docs, etc)
    '--disable-sync',              // No Google account syncing
    '--disable-browser-side-navigation',
    '--disable-infobars',          // No "Chrome is being controlled by..." banners

    // --- BACKGROUND PROCESS KILLERS ---
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',          // No crash reporting
    '--disable-component-update',  // No checking for updates in background
    '--disable-client-side-phishing-detection',
    '--disable-hang-monitor',      // Don't monitor for "Page Unresponsive"
    '--disable-ipc-flooding-protection',
    '--disable-notifications',     // No desktop notifications
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-renderer-backgrounding',
    '--metrics-recording-only',    // Don't report metrics
    '--password-store=basic',      // Don't use system keychain
    '--use-mock-keychain',         // Use a dummy keychain

    // --- STEALTH & NETWORK ---
    '--disable-blink-features=AutomationControlled', // Helps hide Playwright presence
    '--mute-audio',                // Saves CPU cycles
    '--force-color-profile=srgb',  // Consistent rendering
  ],
  handleSIGINT: false,
  handleSIGTERM: false,
  handleSIGHUP: false,
});
          
       const ua = new UserAgent({ deviceCategory: 'desktop' }).toString();
const context = await browser.newContext({
    userAgent: ua, // SET IT HERE
    viewport: { width: 1280, height: 720 }
});
          // RUN SCRAPER
          const pricesFromSource = await runScraper(context, scraper, item.item_id, item.keyword, node.tld, node.region);
          
          // PROCESS RESULTS
          if (pricesFromSource && pricesFromSource.length > 0) {
            for (const p of pricesFromSource) {
              const convertedPrice = await convertToUSD(p, node.currency);
              const landedPrice = calculateLandedCost(convertedPrice, node.region);
              itemPrices.push(landedPrice);
            }
          }

        } catch (err: any) {
          console.error(`  ❌ Source Error [${scraper.source}]:`, err.message);
        } finally {
          // ALWAYS CLOSE BROWSER
          if (browser) {
            await browser.close();
            console.log(`  🧹 RAM Purged after ${scraper.source}.`);
          }
        }
        // Small breathing room between sources
        await wait(2000, 4000); 
      }
    }

    // 4. Update Database with Final Median Price
   // 4. Update Database with Final Median Price
if (itemPrices.length > 0) {
  const flip_price = calculateMedian(itemPrices);
  console.log(`✨ SETTING FLIP PRICE for ${item.ticker}: $${flip_price.toFixed(2)}`);
      
      // Update the main Asset record
     const { error: updateError } = await supabase.from("items").update({ 
    flip_price: flip_price, 
    last_updated: new Date().toISOString() 
  }).eq("id", item.item_id);

      // --- LOG THE FINAL FLIP PRICE IN PRICE_LOGS ---
      await supabase.from("price_logs").insert([{ 
        item_id: item.item_id, 
        price: flip_price, 
        source: 'Final Flip Price', // Direct and clean
        url: 'system://calculated' 
      }]);

      // Log the event for your UI feed
      await supabase.from("feed_events").insert([{
        item_id: item.item_id,
        type: 'PRICE_UPDATE',
        title: `Price Update: ${item.ticker || 'ASSET'}`,
        message: `New Flip Price: $${flip_price.toFixed(2)}`,
        metadata: { price: flip_price, ticker: item.ticker || "ASSET" }
      }]);

    } else {
      console.log(`⚠️ No data found for "${item.title}". Cooling down...`);
      await supabase.from("items").update({ 
        last_updated: new Date().toISOString() 
      }).eq("id", item.item_id);
    }
    
    // Breathing room between items
    await wait(5000, 10000); 
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
  console.log("📡 Oracle Pulse: Checking for high-priority nodes...");

  // 1. Manual Search Priority (Keep this as is)
  if (searchKeyword && searchKeyword !== "undefined") {
    const { data: created, error: manualError } = await supabase.from("items").upsert({ 
      title: searchKeyword, 
      ticker: searchKeyword.substring(0, 5).toUpperCase(),
      flip_price: 0 
    }, { onConflict: 'title' }).select().single();
    
    if (manualError) console.error("❌ Manual Search Error:", manualError.message);
    if (created) return [{ item_id: created.id, keyword: created.title, title: created.title, ticker: created.ticker }];
  }

  // 2. FETCH STALE OR UNSET ITEMS
  // We look for items with $0 OR items that haven't been updated in 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  let { data: priorityItems } = await supabase
    .from("items")
    .select("id, title, ticker, last_updated")
    .or(`flip_price.eq.0,flip_price.is.null,last_updated.lt.${twentyFourHoursAgo}`)
    .order('last_updated', { ascending: true }) // Oldest updates first
    .limit(10); // Batch size

  // 3. SEED GENERATION (Keep database growing)
  const nextSeeds: any[] = [];
  for (let i = 0; i < 5; i++) {
    const { value, done } = await seedStream.next();
    if (done) break;
    if (value) {
      nextSeeds.push({
        title: value,
        ticker: generateUniqueTicker(value),
        flip_price: 0,
        last_updated: new Date(0).toISOString() // Set to epoch so it's marked as "stale"
      });
    }
  }

  if (nextSeeds.length > 0) {
    const { data: insertedData } = await supabase
      .from("items")
      .upsert(nextSeeds, { onConflict: 'title' })
      .select();
    
    if (insertedData) {
      priorityItems = priorityItems ? [...priorityItems, ...insertedData] : insertedData;
    }
  }

  // 4. Finalize Queue and Shuffle
  const finalQueue = (priorityItems || [])
    .sort(() => 0.5 - Math.random())
    .slice(0, 10); 

  console.log(`✅ Queueing ${finalQueue.length} nodes (Mixed fresh and stale).`);
  
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
// --- FIXED BOTTOM BLOCK ---

export async function startScraperLoop() {
  console.log("🟢 Oracle Infinite Loop Started...");
  
  while (true) {
    try {
      // main() already handles seed generation, batching, 
      // and browser management internally.
      await main(); 
    } catch (error: any) {
      console.error("🚨 Scraper Loop encountered a critical issue:", error.message);
    }

    console.log("😴 Cycle complete. Cooling down for 60 seconds...");
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
}

// Entry point for local testing (node scripts/scrapeRunner.ts)
const isMain = process.argv[1] && process.argv[1].includes('scrapeRunner');
if (isMain) {
    startScraperLoop();
}