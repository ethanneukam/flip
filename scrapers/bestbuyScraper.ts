import { Scraper } from "../scripts/scrapeRunner";

const wait = (min = 500, max = 1500) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

async function applyFingerprintSpoofing(page: any) {
  await page.addInitScript(() => {
    // Spoofing WebGL to look like a real desktop GPU
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (param: number) {
      if (param === 37445) return "NVIDIA Corporation";
      if (param === 37446) return "NVIDIA GeForce GTX 1080/PCIe/SSE2";
      return getParameter.apply(this, [param]);
    };
    Object.defineProperty(navigator, "plugins", { get: () => [{ name: "Chrome PDF Plugin" }] });
  });
}

export const bestbuyScraper: Scraper = {
  source: "BestBuy",

  scrape: async (page: any, keyword: string) => {
    try {
      await applyFingerprintSpoofing(page);

      const searchUrl = `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(keyword)}`;
      console.log(`    🔍 [BestBuy] Scanning results for: "${keyword}"`);

      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded", // BestBuy loads results fast, price might need a small wait
        timeout: 50000,
      });

      // Wait for the main results list
      try {
        await page.waitForSelector("li.sku-item", { timeout: 15000 });
      } catch (e) {
        console.log("    ⚠️ [BestBuy] No result items found (Timeout).");
        return null;
      }

      // Select ALL product items
      const productHandles = await page.$$("li.sku-item");
      const results: any[] = [];

      for (const product of productHandles) {
        try {
          const data = await product.evaluate((el: any) => {
            const titleEl = el.querySelector(".sku-header a");
            const priceEl = el.querySelector(".priceView-customer-price span, .priceView-hero-price span");
            const imgEl = el.querySelector("img.product-image");
            
            const rawTitle = titleEl ? titleEl.innerText.trim() : null;
            const rawPrice = priceEl ? priceEl.innerText : null;
            const rawUrl = titleEl ? titleEl.getAttribute("href") : null;
            const rawImg = imgEl ? (imgEl.getAttribute("src") || imgEl.getAttribute("data-src")) : null;

            return {
              title: rawTitle,
              priceText: rawPrice,
              url: rawUrl,
              imageUrl: rawImg
            };
          });

          // Clean and validate data
          if (data.priceText && data.title) {
            const cleanPrice = parseFloat(data.priceText.replace(/[^0-9.]/g, ""));
            
            if (!isNaN(cleanPrice) && cleanPrice > 0) {
              results.push({
                price: cleanPrice,
                url: data.url?.startsWith("http") ? data.url : `https://www.bestbuy.com${data.url}`,
                condition: "New",
                title: data.title,
                image_url: data.imageUrl,
                ticker: keyword
              });
            }
          }
        } catch (itemErr) {
          continue; // Skip failed items
        }
      }

      console.log(`    ✅ [BestBuy] Extracted ${results.length} items.`);
      return results;

    } catch (err: any) {
      console.log("❌ BestBuy Scrape Error:", err.message);
      return null;
    }
  },
};
