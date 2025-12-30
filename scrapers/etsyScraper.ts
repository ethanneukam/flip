import { Scraper } from "./types";

const wait = (min = 500, max = 1500) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

// Re-using your fingerprinting for Etsy's bot detection
async function applyFingerprintSpoofing(page: any) {
  await page.addInitScript(() => {
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (param: number) {
      if (param === 37445) return "NVIDIA Corporation";
      if (param === 37446) return "NVIDIA GeForce GTX 1080/PCIe/SSE2";
      return getParameter.apply(this, [param]);
    };
  });
}

export const etsyScraper: Scraper = {
  source: "Etsy",

  scrape: async (page: any, keyword: string) => {
    try {
      await applyFingerprintSpoofing(page);
      
      const searchUrl = `https://www.etsy.com/search?q=${encodeURIComponent(keyword)}`;
      console.log("🔍 Etsy search:", searchUrl);

      await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded",
        timeout: 45000 
      });

      // Etsy often throws a "cookies" or "region" overlay
      await wait(2000, 3500);

      // Target real search results, skipping ads if possible
      // Etsy results are usually in data-search-results
      const item = await page.$(".search-listings-group li.wt-list-unstyled:not(.wt-display-none)");
      
      if (!item) {
        console.log("⚠️ Etsy: no product found");
        return null;
      }

      // --- METADATA EXTRACTION ---
      const title = await item.$eval(".v2-listing-card__title", (el: any) => el.textContent?.trim()).catch(() => "Unknown Asset");
      const imageUrl = await item.$eval("img.wt-width-full", (el: any) => el.src).catch(() => null);

      const url = await item.$eval("a.listing-link", (el: any) => el.getAttribute("href")).catch(() => null);
      
      // Etsy prices can have currency symbols or ranges; span.currency-value is usually just the number
      const priceText = await item.$eval("span.currency-value", (el: any) => el.textContent).catch(() => null);

      if (!priceText || !url) return null;

      const price = parseFloat(priceText.replace(/[^0-9.]/g, ""));

      console.log(`✅ Etsy: $${price} — ${title}`);

      return {
        price,
        url: url.split('?')[0], // Clean the URL of tracking params
        condition: "Handmade/Vintage",
        title,
        image_url: imageUrl,
        ticker: keyword
      };
    } catch (err) {
      console.error("❌ Etsy scrape error:", err);
      return null;
    }
  },
};
