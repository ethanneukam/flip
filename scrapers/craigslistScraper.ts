import { ScraperResult } from "../scrapeRunner";

export const craigslistScraper = {
  source: "craigslist",

  run: async (page: any, keyword: string): Promise<ScraperResult | null> => {
    try {
      await page.goto(
        `https://www.craigslist.org/search/sss?query=${encodeURIComponent(
          keyword
        )}`,
        { waitUntil: "domcontentloaded" }
      );

      await page.waitForTimeout(1500 + Math.random() * 1000);

      const item = await page.$("li.result-row");
      if (!item) return null;

      const priceEl = await item.$(".result-price");
      const urlEl = await item.$("a.result-title");

      const priceText = priceEl ? await priceEl.innerText() : null;
      const url = urlEl ? await urlEl.getAttribute("href") : null;

      if (!priceText || !url) return null;

      const price = parseFloat(priceText.replace(/[^0-9.]/g, ""));

      return { price, url };
    } catch {
      return null;
    }
  },
};