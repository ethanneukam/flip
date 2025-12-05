import { Scraper } from "../scrapers";
import pino from "pino";

const log = pino({ name: "scrape-runner" });

export async function runScraperWithRetries(
  scraper: Scraper,
  page: any,
  keyword: string,
  maxRetries = 3
) {
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;

    try {
      const result = await scraper.scrape(page, keyword);

      if (!result) throw new Error("no-result");

      log.info(
        `${scraper.source} succeeded on attempt ${attempt}: $${result.price}`
      );

      return result;
    } catch (err: any) {
      log.warn(
        `${scraper.source} failed attempt ${attempt}: ${err?.message || err}`
      );

      if (attempt >= maxRetries) {
        log.error(`${scraper.source} permanently failed.`);
        return null;
      }

      // small retry delay
      await new Promise(res => setTimeout(res, 1200 + Math.random() * 2000));
    }
  }

  return null;
}
