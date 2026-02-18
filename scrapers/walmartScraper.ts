import UserAgent from "user-agents";
import { Scraper } from "../lib/scraper-types"; // Corrected import path

const wait = (min = 500, max = 1500) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

async function humanScroll(page: any) {
  for (let i = 0; i < 2; i++) {
    await page.mouse.wheel(0, Math.random() * 600 + 200);
    await wait(300, 700);
  }
}

export const walmartScraper: Scraper = {
  source: "Walmart",

  scrape: async (page: any, keyword: string) => {
    try {
      const ua = new UserAgent({ deviceCategory: 'desktop' }).toString();
      await page.setUserAgent(ua);

      const searchUrl = `https://www.walmart.com/search?q=${encodeURIComponent(keyword)}`;
      
      // 1. Fail fast if the page takes too long
      const response = await page.goto(searchUrl, {
        waitUntil: "load", // Wait for full load for Walmart
        timeout: 35000,    // Shorter than ScrapeRunner's 50s limit
      });

      // 2. Check for Bot Block
      const content = await page.content();
      if (content.includes("Verify you are human") || content.includes("blocked") || response.status() === 403) {
        console.error("  ⚠️ [Walmart] Blocked by Bot Detection (PerimeterX).");
        return null;
      }

      await wait(2000, 4000);
      await humanScroll(page);

      // 3. Robust Selector Search
      // Walmart cycles through: [data-item-id], [data-testid="variant-tile"], and .f6-m
      const productHandles = await page.$$("[data-item-id], [data-testid='variant-tile']");
      
      if (productHandles.length === 0) {
        console.log("  ⚠️ [Walmart] No items found in grid.");
        return null;
      }

      const results: any[] = [];

      for (const handle of productHandles.slice(0, 10)) { // Limit to top 10 for speed
        try {
          const data = await handle.evaluate((el: any) => {
            const titleEl = el.querySelector("span[itemprop='name']") || el.querySelector(".f6-m");
            const priceEl = el.querySelector("[data-automation='product-price']") || el.querySelector(".w_iN_0");
            const linkEl = el.querySelector("a");

            return {
              title: titleEl ? titleEl.innerText.trim() : null,
              url: linkEl ? linkEl.getAttribute("href") : null,
              priceText: priceEl ? priceEl.innerText : null,
            };
          });

          if (data.priceText && data.url && data.title) {
            // Extract numbers including decimals (e.g. "Now $12.99" -> 12.99)
            const matches = data.priceText.match(/\d+\.\d+/);
            const cleanPrice = matches ? parseFloat(matches[0]) : parseFloat(data.priceText.replace(/[^0-9.]/g, ""));
            
            if (!isNaN(cleanPrice) && cleanPrice > 0) {
              results.push({
                price: cleanPrice,
                url: data.url.startsWith("http") ? data.url : `https://www.walmart.com${data.url}`,
                condition: "New",
                title: data.title,
                ticker: keyword
              });
            }
          }
        } catch (itemErr) {
          continue;
        }
      }

      console.log(`    ✅ [Walmart] Extracted ${results.length} valid listings.`);
      return results;

    } catch (err: any) {
      console.error(`  ❌ [Walmart] Scrape Error: ${err.message}`);
      return null;
    }
  },
};
