import UserAgent from "user-agents";
import { Scraper } from "./types";

const wait = (min = 500, max = 1500) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

async function humanScroll(page: any) {
  for (let i = 0; i < 2; i++) {
    await page.mouse.wheel(0, Math.random() * 600 + 200);
    await wait(300, 800);
  }
}

export const walmartScraper: Scraper = {
  source: "Walmart",

  scrape: async (page: any, keyword: string) => {
    try {
      const ua = new UserAgent().toString();

      await page.setExtraHTTPHeaders({
        "user-agent": ua,
        "accept-language": "en-US,en;q=0.9",
        "referer": "https://www.google.com/"
      });

      // Walmart strictly validates User-Agent
      await page.setUserAgent(ua);

      const searchUrl = `https://www.walmart.com/search?q=${encodeURIComponent(keyword)}`;
      console.log("🔍 Walmart Search:", searchUrl);

      // We use 'networkidle' for Walmart because prices are injected late
      await page.goto(searchUrl, {
        waitUntil: "networkidle",
        timeout: 60000,
      });

      await wait(2000, 4000);
      await humanScroll(page);

      // Target the first actual product tile (avoiding sponsored/ads if possible)
      const product = await page.$("[data-testid='list-view'], [data-item-id]");

      if (!product) {
        console.log("⚠️ No Walmart product found.");
        return null;
      }

      // --- METADATA EXTRACTION ---
      // 2025 Title selector: Often wrapped in span[itemprop='name'] or data-automation='product-title'
      const title = await product.$eval("span[itemprop='name'], [data-automation='product-title']", (el: any) => el.textContent?.trim()).catch(() => "Unknown Asset");
      
      const relativeUrl = await product.$eval("a", (el: any) => el.getAttribute("href"));
      const url = relativeUrl.startsWith("http") ? relativeUrl : "https://www.walmart.com" + relativeUrl;

      // Image extraction
      const imageUrl = await product.$eval("img", (img: any) => img.src).catch(() => null);

      // Price extraction (handling currency symbols and cents)
      const priceText = await product.$eval("[data-automation='product-price'] .w_iUH7, [data-automation='product-price']", (el: any) => 
        el.textContent?.replace(/[^0-9.]/g, "")
      ).catch(() => null);

      if (!priceText) return null;

      const price = parseFloat(priceText);

      console.log(`✅ Walmart: $${price} — ${title}`);

      return {
        price,
        url,
        condition: "New",
        title,
        image_url: imageUrl,
        ticker: keyword
      };
    } catch (err) {
      console.error("❌ Walmart Scrape Error:", err);
      return null;
    }
  },
};
