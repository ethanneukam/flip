import UserAgent from "user-agents";
import { Scraper } from "./types";

const wait = (min = 500, max = 1500) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

// Target is very aggressive with Akamai bot detection
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
      await page.setExtraHTTPHeaders({
        "user-agent": new UserAgent().toString(),
        "accept-language": "en-US,en;q=0.9",
      });

      await applyFingerprintSpoofing(page);

      const searchUrl = `https://www.target.com/s?searchTerm=${encodeURIComponent(keyword)}`;
      console.log("🔍 Navigating Target:", searchUrl);

      // We use networkidle here because Target's price and inventory data 
      // are loaded via secondary API calls after the initial page load.
      await page.goto(searchUrl, {
        waitUntil: "networkidle",
        timeout: 60000,
      });

      await wait(2000, 3500);

      // Target uses 'data-test' attributes which are more stable than classes
      const productCard = await page.$("[data-test='@web/site-top-of-funnel/ProductCardWrapper']");
      
      if (!productCard) {
        console.log("⚠️ No Target product found.");
        return null;
      }

      // --- METADATA EXTRACTION ---
      const title = await productCard.$eval("[data-test='product-title']", (el: any) => el.textContent?.trim()).catch(() => "Unknown Asset");
      const relativeUrl = await productCard.$eval("[data-test='product-title']", (el: any) => el.getAttribute("href")).catch(() => "");
      const url = "https://www.target.com" + relativeUrl;

      // Image extraction
      const imageUrl = await productCard.$eval("picture img", (img: any) => img.src).catch(() => null);

      // Price extraction - Target often has multiple price spans (original vs sale)
      const priceText = await productCard.$eval("[data-test='current-price']", (el: any) => 
        el.textContent?.replace(/[^0-9.]/g, "")
      ).catch(() => null);

      const price = parseFloat(priceText || "0");

      if (price === 0) return null;

      console.log(`✅ Target: $${price} — ${title}`);

      return {
        price,
        url,
        condition: "New",
        title,
        image_url: imageUrl,
        ticker: keyword
      };
    } catch (err) {
      console.log("❌ Target Scrape Error:", err);
      return null;
    }
  },
};
