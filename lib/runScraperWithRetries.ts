// lib/runScraperWithRetries.ts
import { Scraper } from "../scrapers"; // your Scraper interface path
import pino from "pino";

const log = pino({ name: "scrape-runner" });

export async function runScraperWithRetries({
  page,
  scraper,
  item_id,
  keyword,
  maxRetries = 3,
  baseDelay = 1000,
}: {
  page: any;
  scraper: Scraper;
  item_id: string;
  keyword: string;
  maxRetries?: number;
  baseDelay?: number;
}) {
  let attempt = 0;
  while (attempt <= maxRetries) {
    attempt++;
    try {
      const result = await scraper.scrape(page, keyword);
      if (!result) throw new Error("no-result");

      // quick heuristic checks (error deduction)
      if (result.price === 0 || Number.isNaN(result.price)) throw new Error("invalid-price");

      // success
      return result;
    } catch (err: any) {
      log.warn({ scraper: scraper.source, attempt, error: err.message }, "scrape-failed");
      if (attempt > maxRetries) {
        log.error({ scraper: scraper.source, keyword, item_id }, "scrape-final-fail");
        return null;
      }
      // exponential backoff + jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500);
      await new Promise((r) => setTimeout(r, delay));
      // optionally reset page / context if blocked
      try {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
      } catch {}
    }
  }
  return null;
}