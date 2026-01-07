import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { chromium, BrowserContext, Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import UserAgent from "user-agents";
import { allScrapers } from "../scrapers";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Enhanced Stealth: Prevents detection by rotating fingerprints
 * and mimicking human-like navigation.
 */
async function applyStealthAndOptimization(page: Page) {
  // 1. Rotate User Agent per page to prevent session-linking
  const ua = new UserAgent({ deviceCategory: 'desktop' }).toString();
  await page.setUserAgent(ua);

  // 2. Block heavy/tracking resources (Saves 70% bandwidth)
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

  // 3. Realistic Headers
  await page.setExtraHTTPHeaders({
    'referer': 'https://www.google.com/',
    'accept-language': 'en-US,en;q=0.9',
  });
}

const wait = (min = 1500, max = 4000) =>
  new Promise((res) => setTimeout(res, Math.random() * (max - min) + min));

async function runScraper(context: BrowserContext, scraper: any, item_id: string, keyword: string) {
  const page = await context.newPage();
  await applyStealthAndOptimization(page);

  // Amazon/eBay usually load within 10s, but scrapers need time to parse
  page.setDefaultTimeout(25000); 

  try {
    console.log(`    🔍 [${scraper.source}] Initializing: "${keyword}"`);
    
    // Add a tiny "Human-like" delay before searching
    await wait(500, 1500);

    const result = await Promise.race([
      scraper.scrape(page, keyword),
      new Promise((_, reject) => setTimeout(() => reject(new Error("ORACLE_TIMEOUT")), 35000))
    ]) as any;

    if (result && result.price) {
      console.log(`    ✅ [${scraper.source}] Found: $${result.price}`);

      // Sync to Supabase
      const payload = {
        item_id,
        source: scraper.source,
        price: result.price,
        url: result.url,
        condition: result.condition || "New",
        title: result.title || null,
        image_url: result.image_url || null
      };

      await Promise.all([
        supabase.from("market_data").upsert([payload], { onConflict: 'item_id,source' }),
        supabase.from("price_logs").insert([{ item_id, price: result.price, source: scraper.source, url: result.url }]),
        supabase.from("feed_events").insert([{
          type: 'ORACLE_ALERT',
          title: `Signal: ${result.title || keyword}`,
          description: `Price detected: $${result.price.toLocaleString()} on ${scraper.source}.`,
          metadata: { item_id, ticker: keyword, price: result.price, source: scraper.source }
        }])
      ]);

      return result.price;
    }
    return null;
  } catch (err: any) {
    if (err.message.includes('CAPTCHA') || err.message.includes('denied')) {
      console.error(`    ⚠️ [${scraper.source}] BLOCKED by Anti-Bot.`);
    } else {
      console.error(`    ❌ [${scraper.source}] Error: ${err.message}`);
    }
    return null;
  } finally {
    await page.close();
  }
}

export async function main(searchKeyword?: string) {
  const items = await getItemsToScrape(searchKeyword);
  if (items.length === 0) return;

  const browser = await chromium.launch({ 
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1280,720'
    ] 
  });

  const context = await browser.newContext();

  for (const item of items) {
    console.log(`\n--- Market Scan: ${item.keyword} ---`);
    let prices: number[] = [];

    for (const scraper of allScrapers) {
      const price = await runScraper(context, scraper, item.item_id, item.keyword);
      if (price) prices.push(price);
      
      // Crucial: Vary wait times between scrapers to prevent IP flagging
      await wait(3000, 6000); 
    }

    if (prices.length > 0) {
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      console.log(`✨ AVG_PRICE: $${avgPrice.toFixed(2)}`);
      await supabase.from("items").update({ 
        flip_price: avgPrice, 
        last_updated: new Date().toISOString() 
      }).eq("id", item.item_id);
    }
  }

  await browser.close();
  console.log("\n🏁 Market Scan Complete.");
}

// Support functions
async function getItemsToScrape(searchKeyword?: string) {
  if (searchKeyword) {
    const { data: item } = await supabase.from("items").upsert({ title: searchKeyword }, { onConflict: 'title' }).select().single();
    return item ? [{ item_id: item.id, keyword: item.title }] : [];
  }
  const { data } = await supabase.from("items").select("id, title");
  return data?.map((item: any) => ({ item_id: item.id, keyword: item.title })) || [];
}

main(process.argv[2]).then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
});
