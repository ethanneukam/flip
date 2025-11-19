import { ScraperResult } from "../scrapeRunner";

export const offerupScraper = {
  source: "offerup",

  run: async (page: any, keyword: string): Promise<ScraperResult | null> => {
    try {
      await page.goto(
        `https://offerup.com/search/?q=${encodeURIComponent(keyword)}`,
        { waitUntil: "domcontentloaded" }
      );

      await page.waitForTimeout(2000 + Math.random() * 1000);

      const item = await page.$("a[href*='/item/']");
      if (!item) return null;

      const url = await item.getAttribute("href");
      if (!url) return null;

      const fullUrl = url.startsWith("http") ? url : `https://offerup.com${url}`;

      await page.goto(fullUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1200 + Math.random() * 800);

      const priceEl = await page.$("span[class*='Price']");
      if (!priceEl) return null;

      const priceText = await priceEl.innerText();
      const price = parseFloat(priceText.replace(/[^0-9.]/g, ""));

      return { price, url: fullUrl };
    } catch {
      return null;
    }
  },
};