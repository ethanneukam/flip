import { Page } from "playwright";
import { Scraper, ScraperResult } from "./scraper-types";

/**
 * Retries a scraper if it fails or times out.
 * Updated to handle ScraperResult[]
 */
export async function runScraperWithRetries(
  scraper: Scraper,
  page: Page,
  keyword: string,
  retries = 2
): Promise<ScraperResult[] | null> {
  for (let i = 0; i < retries; i++) {
    try {
      // We now expect an array from every scraper
      const results = await scraper.scrape(page, keyword);
      
      if (results && results.length > 0) {
        return results;
      }
      
      console.log(`⚠️ [${scraper.source}] No results on attempt ${i + 1}`);
    } catch (err: any) {
      console.error(`❌ [${scraper.source}] Attempt ${i + 1} failed: ${err.message}`);
      if (i === retries - 1) return null;
    }
    
    // Wait before retrying
    await new Promise(res => setTimeout(res, 2000));
  }
  return null;
}
