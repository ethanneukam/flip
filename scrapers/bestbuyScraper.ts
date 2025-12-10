import UserAgent from "user-agents";
import { Scraper } from "./types"; // <-- REQUIRED

const wait = (min = 300, max = 900) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

export const bestbuyScraper: Scraper = {
  source: "BestBuy",

  scrape: async (page, keyword) => {
    try {
      await page.setExtraHTTPHeaders({
        "user-agent": new UserAgent().toString(),
        "accept-language": "en-US,en;q=0.9",
      });

      const searchUrl = `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(keyword)}`;
      console.log("🔍 Navigating:", searchUrl);

      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 50000,
      });

      await wait(1200, 1600);

      const product = await page.$("li.sku-item");

      if (!product) {
        console.log("⚠️ No BestBuy product found.");
        return null;
      }

      const url = await product.$eval(
        "h4 a",
        el => "https://www.bestbuy.com" + el.getAttribute("href")
      );

      const priceText = await product.$eval(".priceView-hero-price span", el =>
        el.textContent?.replace(/[^0-9.]/g, "")
      );

      const price = parseFloat(priceText || "0");

      console.log(`✅ BestBuy: $${price} — ${url}`);

      return {
        price,
        url,
        condition: "New",
      };
    } catch (err) {
      console.log("❌ BestBuy Scrape Error:", err);
      return null;
    }
  },
};
