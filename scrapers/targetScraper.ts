import UserAgent from "user-agents";
import { Scraper } from "../scripts/scrapeRunner";

const wait = (min = 500, max = 1500) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

async function applyFingerprintSpoofing(page: any) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (param: number) {
      if (param === 37445) return "NVIDIA Corporation";
      if (param === 37446) return "NVIDIA GeForce GTX 1080/PCIe/SSE2";
      return getParameter.apply(this, [param]);
    };
  });
}

export const targetScraper: Scraper = {
  source: "Target",

  scrape: async (page: any, keyword: string) => {
    try {
      await applyFingerprintSpoofing(page);

      const searchUrl = `https://www.target.com/s?searchTerm=${encodeURIComponent(keyword)}`;
      console.log(`    🔍 [Target] Scanning search results for: "${keyword}"`);

      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded", // domcontentloaded + manual wait is safer for Akamai than networkidle
        timeout: 60000,
      });

      // Target needs a moment for the Redux store to hydrate the price data
      await wait(3000, 5000);

      // Scroll slightly to trigger lazy loading of the product grid
      await page.mouse.wheel(0, 1000);
      await wait(1000, 2000);

      // Select ALL organic product cards
      const productHandles = await page.$$("[data-test='@web/site-top-of-funnel/ProductCardWrapper']");
      
      console.log(`    📊 [Target] Found ${productHandles.length} items in result grid.`);

      const results: any[] = [];

      for (const handle of productHandles) {
        try {
          const data = await handle.evaluate((el: any) => {
            const titleEl = el.querySelector("[data-test='product-title']");
            const priceEl = el.querySelector("[data-test='current-price']");
            const imgEl = el.querySelector("picture img");

            return {
              title: titleEl ? titleEl.innerText.trim() : "Target Asset",
              url: titleEl ? titleEl.getAttribute("href") : null,
              priceText: priceEl ? priceEl.innerText : null,
              imageUrl: imgEl ? imgEl.src : null
            };
          });

          if (data.priceText && data.url) {
            const cleanPrice = parseFloat(data.priceText.replace(/[^0-9.]/g, ""));
            
            if (!isNaN(cleanPrice) && cleanPrice > 0) {
              results.push({
                price: cleanPrice,
                url: data.url.startsWith("http") ? data.url : `https://www.target.com${data.url}`,
                condition: "New",
                title: data.title,
                image_url: data.imageUrl,
                ticker: keyword
              });
            }
          }
        } catch (itemErr) {
          continue;
        }
      }

      console.log(`    ✅ [Target] Extracted ${results.length} valid listings.`);
      return results;

    } catch (err: any) {
      console.error("❌ Target Scrape Error:", err.message);
      return null;
    }
  },
};
