import { ScraperResult } from "../scripts/scrapeRunner";

export const etsyScraper = {
  source: "etsy",

  run: async (page: any, keyword: string): Promise<ScraperResult | null> => {
    try {
      await page.goto(
        `https://www.etsy.com/search?q=${encodeURIComponent(keyword)}`,
        { waitUntil: "domcontentloaded" }
      );

      await page.waitForTimeout(2500 + Math.random() * 1500);

      const item = await page.$("li.wt-list-unstyled");
      if (!item) return null;

      const priceEl = await item.$("span.currency-value");
      const urlEl = await item.$("a.listing-link");

      const priceText = priceEl ? await priceEl.innerText() : null;
      const url = urlEl ? await urlEl.getAttribute("href") : null;

      if (!priceText || !url) return null;

      const price = parseFloat(priceText);

      return { price, url };
    } catch {
      return null;
    }
  },
};
