import { ScraperResult } from "../scripts/scrapeRunner";

export const stockxScraper = {
  source: "stockx",

  scrape: async (page: any, keyword: string): Promise<ScraperResult | null> => {
    try {
      await page.waitForTimeout(600 + Math.random() * 600);

      await page.goto(`https://stockx.com/search?s=${encodeURIComponent(keyword)}`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForTimeout(2000 + Math.random() * 1200);

      const item = await page.$("a.css-pncxxp");
      if (!item) return null;

      const url = await item.getAttribute("href");
      if (!url) return null;

      const productURL = `https://stockx.com${url}`;

      await page.goto(productURL, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500 + Math.random() * 1000);

      const priceEl = await page.$("div[data-testid='market-low']");
      if (!priceEl) return null;

      const priceText = await priceEl.innerText();
      const price = parseFloat(priceText.replace(/[^0-9.]/g, ""));

      return {
        price,
        url: productURL,
        condition: "New"   // required by Scraper interface
      };
    } catch {
      return null;
    }
  },
};
