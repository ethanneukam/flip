import { Scraper } from "../scripts/scrapeRunner";

const wait = (min = 1000, max = 3000) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

async function applyFingerprintSpoofing(page: any) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (param: number) {
      if (param === 37445) return "NVIDIA Corporation";
      return getParameter.apply(this, [param]);
    };
  });
}

export const stockxScraper: Scraper = {
  source: "StockX",

  scrape: async (page: any, keyword: string) => {
    try {
      await applyFingerprintSpoofing(page);

      const searchUrl = `https://stockx.com/search?s=${encodeURIComponent(keyword)}`;
      console.log(`    🔍 [StockX] Scanning market search: "${keyword}"`);

      // Using 'commit' or 'domcontentloaded' to beat Cloudflare's slower script checks
      await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded", 
        timeout: 60000 
      });

      // Essential wait for DataDome/Cloudflare to settle
      await wait(4000, 6000);

      // Select ALL product tiles
      const productHandles = await page.$$("[data-testid='product-tile']");
      
      console.log(`    📊 [StockX] Found ${productHandles.length} items in the grid.`);

      const results: any[] = [];

      for (const handle of productHandles) {
        try {
          const data = await handle.evaluate((el: any) => {
            const linkEl = el.querySelector("a");
            const titleEl = el.querySelector("p"); // Title is usually the first P tag
            const imgEl = el.querySelector("img");
            // Price on grid is usually "Lowest Ask"
            const priceEl = el.querySelector("[data-testid='price-text'], .p-1"); 

            return {
              title: titleEl ? titleEl.innerText.trim() : "StockX Item",
              priceText: priceEl ? priceEl.innerText : null,
              url: linkEl ? linkEl.getAttribute("href") : null,
              imageUrl: imgEl ? imgEl.src : null
            };
          });

          if (data.priceText && data.url) {
            const cleanPrice = parseFloat(data.priceText.replace(/[^0-9.]/g, ""));
            
            if (!isNaN(cleanPrice) && cleanPrice > 0) {
              results.push({
                price: cleanPrice,
                url: data.url.startsWith("http") ? data.url : `https://stockx.com${data.url}`,
                condition: "New (Verified)",
                title: data.title,
                image_url: data.imageUrl,
                ticker: keyword
              });
            }
          }
        } catch (e) { continue; }
      }

      console.log(`    ✅ [StockX] Extracted ${results.length} market prices.`);
      return results;

    } catch (err: any) {
      console.error("❌ StockX Scrape Error:", err.message);
      return null;
    }
  },
};
