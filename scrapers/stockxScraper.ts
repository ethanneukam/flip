import { Scraper } from "./types";

const wait = (min = 1000, max = 3000) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

async function applyFingerprintSpoofing(page: any) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    // StockX specifically checks for automation flags in the canvas
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

      // StockX often blocks if you go straight to search. 
      // Sometimes a quick "thinking" delay on the home page helps.
      const searchUrl = `https://stockx.com/search?s=${encodeURIComponent(keyword)}`;
      console.log("🔍 StockX search:", searchUrl);

      await page.goto(searchUrl, { 
        waitUntil: "networkidle", 
        timeout: 60000 
      });

      // If a captcha appears, this wait gives you a chance to solve it manually or let a solver run
      await wait(3000, 5000);

      // Stable selector using data-testid instead of random CSS classes
      const item = await page.$("[data-testid='product-tile'] a");
      if (!item) {
        console.log("⚠️ StockX: Product tile not found.");
        return null;
      }

      // --- METADATA EXTRACTION ---
      const title = await item.$eval("p", (el: any) => el.textContent?.trim()).catch(() => "Unknown Asset");
      const imageUrl = await item.$eval("img", (img: any) => img.src).catch(() => null);
      
      const href = await item.getAttribute("href");
      const productURL = href.startsWith("http") ? href : `https://stockx.com${href}`;

      // Navigation for detailed price (StockX price varies by size, so we grab 'Last Sale')
      await page.goto(productURL, { waitUntil: "domcontentloaded" });
      await wait(2000, 3500);

      // 'market-summary-last-sale' is the most accurate "Flip Price" indicator on StockX
      const priceText = await page.$eval("[data-testid='market-summary-last-sale']", (el: any) => el.innerText)
        .catch(async () => {
          // Fallback to the ask price if last sale isn't visible
          return await page.$eval(".latest-ask-price", (el: any) => el.innerText).catch(() => null);
        });

      if (!priceText) return null;

      const price = parseFloat(priceText.replace(/[^0-9.]/g, ""));

      console.log(`✅ StockX: $${price} — ${title}`);

      return {
        price,
        url: productURL,
        condition: "New (Verified)",
        title,
        image_url: imageUrl,
        ticker: keyword
      };
    } catch (err) {
      console.error("❌ StockX Scrape Error:", err);
      return null;
    }
  },
};
