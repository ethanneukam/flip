// scripts/runAmazonTest.ts
import { chromium } from "playwright";
import { amazonScraper } from "../scrapers/amazonScraper";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const result = await amazonScraper.scrape(page, "Nintendo Switch");
  console.log(result);

  await browser.close();
}

run();
