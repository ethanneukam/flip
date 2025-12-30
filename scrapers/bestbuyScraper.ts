import UserAgent from "user-agents";
import { Scraper } from "./types";

const wait = (min = 300, max = 900) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

// Re-applying your stealth fingerprinting for BestBuy (Akamai detection)
async function applyFingerprintSpoofing(page) {
  await page.addInitScript(() => {
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (param) {
      if (param === 37445) return "NVIDIA Corporation";
      if (param === 37446) return "NVIDIA GeForce GTX 1080/PCIe/SSE2";
      return getParameter.apply(this, [param]);
    };
    Object.defineProperty(navigator, "plugins", { get: () => [{ name: "Chrome PDF Plugin" }] });
  });
}

export const bestbuyScraper: Scraper = {
  source: "BestBuy",

  scrape: async (page, keyword) => {
    try {
      await page.setExtraHTTPHeaders({
        "user-agent": new UserAgent().toString(),
        "accept-language": "en-US,en;q=0.9",
      });

      await applyFingerprintSpoofing(page);

      const searchUrl = `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(keyword)}`;
      console.log("🔍 Navigating BestBuy:", searchUrl);

      await page.goto(searchUrl, {
        waitUntil: "networkidle", // BestBuy loads price/images via client-side JS
        timeout: 50000,
      });

      await wait(1500, 2500);

      // Target the first product item
      const product = await page.$("li.sku-item");

      if (!product) {
        console.log("⚠️ No BestBuy product found.");
        return null;
      }

      // --- METADATA EXTRACTION ---
      const title = await product.$eval(".sku-header a", el => el.textContent?.trim()).catch(() => "Unknown Asset");
      const imageUrl = await product.$eval("img.product-image", el => (el as HTMLImageElement).src).catch(() => null);
      
      const url = await product.$eval(
        ".sku-header a",
        el => el.getAttribute("href")?.startsWith("http") 
          ? el.getAttribute("href") 
          : "https://www.bestbuy.com" + el.getAttribute("href")
      ).catch(() => "");

      const priceText = await product.$eval(".priceView-hero-price span", el =>
        el.textContent?.replace(/[^0-9.]/g, "")
      ).catch(() => "0");

      const price = parseFloat(priceText || "0");

      if (price === 0) return null;

      console.log(`✅ BestBuy: $${price} — ${title}`);

      return {
        price,
        url,
        condition: "New",
        title,
        image_url: imageUrl,
        ticker: keyword
      };
    } catch (err) {
      console.log("❌ BestBuy Scrape Error:", err);
      return null;
    }
  },
};
