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

/**
 * Enhanced Stealth: Prevents detection by rotating fingerprints
 */
async function applyStealthAndOptimization(page: Page) {
  const ua = new UserAgent({ deviceCategory: 'desktop' }).toString();
  await page.setUserAgent(ua);

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

  await page.setExtraHTTPHeaders({
    'referer': 'https://www.google.com/',
    'accept-language': 'en-US,en;q=0.9',
  });
}

const wait = (min = 1500, max = 4000) =>
  new Promise((res) => setTimeout(res, Math.random() * (max - min) + min));

/**
 * runScraper now handles an ARRAY of ScraperResults
 */
async function runScraper(context: BrowserContext, scraper: any, item_id: string, keyword: string) {
  const page = await context.newPage();
  await applyStealthAndOptimization(page);

  page.setDefaultTimeout(25000); 

  try {
    console.log(`    🔍 [${scraper.source}] Initializing: "${keyword}"`);
    await wait(500, 1500);

    // EXPECTING ARRAY
    const results = await Promise.race([
      scraper.scrape(page, keyword),
      new Promise((_, reject) => setTimeout(() => reject(new Error("ORACLE_TIMEOUT")), 45000))
    ]) as ScraperResult[] | null;

    if (results && results.length > 0) {
      console.log(`    ✅ [${scraper.source}] Found ${results.length} items.`);

      let validPrices: number[] = [];

      for (const result of results) {
        if (!result.price) continue;
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

        // Insert every found item into market_data and price_logs
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

      // Return the average for this specific scraper to help calculate the global average
      return validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
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
  const items = await getItemsToScrape(searchKeyword);
  if (items.length === 0) return;

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] 
  });

  const context = await browser.newContext();

  for (const item of items) {
    console.log(`\n--- Market Scan: ${item.keyword} ---`);
    let sourceAverages: number[] = [];

    for (const scraper of allScrapers) {
      const avgPriceFromSource = await runScraper(context, scraper, item.item_id, item.keyword);
      if (avgPriceFromSource) sourceAverages.push(avgPriceFromSource);
      await wait(3000, 6000); 
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

  await browser.close();
  console.log("\n🏁 Market Scan Complete.");
}

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
