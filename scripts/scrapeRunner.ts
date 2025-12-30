// scripts/scrapeRunner.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { chromium, Browser, Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import UserAgent from "user-agents";
import { allScrapers } from "../scrapers";

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

export interface Scraper {
  source: string;
  scrape: (page: any, keyword: string) => Promise<ScraperResult | null>;
}

const wait = (min = 100, max = 400) =>
  new Promise((res) => setTimeout(res, Math.random() * (max - min) + min));

async function getItemsToScrape() {
  const { data, error } = await supabase.from("items").select("id, title");
  if (error) return [];
  return data.map((item: any) => ({ item_id: item.id, keyword: item.title }));
}

async function runScraper({ page, scraper, item_id, keyword }: any) {
  try {
    const result = await scraper.scrape(page, keyword);
    if (!result || !result.price) return null;

    await supabase.from("market_data").insert([{
      item_id,
      source: scraper.source,
      price: result.price,
      url: result.url,
      condition: result.condition || "New",
      title: result.title || null,
      image_url: result.image_url || null,
      created_at: new Date().toISOString(),
    }]);

    return result;
  } catch (err) {
    return null;
  }
}

export async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: new UserAgent().toString() });
  const page = await context.newPage();
  const items = await getItemsToScrape();

  for (const item of items) {
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
      await supabase.from("items").update({ flip_price: flipPrice, last_updated: new Date().toISOString() }).eq("id", item.item_id);
    }
  }
  await browser.close();
}

// Allow running directly via ts-node
if (require.main === module) {
  main().then(() => console.log("Done")).catch(console.error);
}
