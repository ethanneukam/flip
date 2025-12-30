import { Scraper } from "./types";

const wait = (min = 500, max = 1500) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

// OfferUp is very sensitive to headless detection
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

export const offerupScraper: Scraper = {
  source: "OfferUp",

  scrape: async (page: any, keyword: string) => {
    try {
      await applyFingerprintSpoofing(page);
      
      const searchUrl = `https://offerup.com/search/?q=${encodeURIComponent(keyword)}`;
      console.log("🔍 OfferUp search:", searchUrl);

      await page.goto(searchUrl, { 
        waitUntil: "networkidle", 
        timeout: 50000 
      });

      await wait(2000, 4000);

      // OfferUp uses 'db-item-tile' or generic links for items
      const item = await page.$("a[href*='/item/detail/']");
      if (!item) {
        console.log("⚠️ OfferUp: No product found");
        return null;
      }

      // --- METADATA EXTRACTION ---
      // We grab title and image from the 'alt' and 'src' of the listing image
      const title = await item.$eval("img", (img: any) => img.alt).catch(() => "Unknown Asset");
      const imageUrl = await item.$eval("img", (img: any) => img.src).catch(() => null);
      
      const relUrl = await item.getAttribute("href");
      const fullUrl = relUrl.startsWith("http") ? relUrl : `https://offerup.com${relUrl}`;

      // Extract price from the aria-label or text content of the tile
      const priceText = await item.$eval("span, div", (el: any) => {
        // Look specifically for strings containing '$'
        return el.textContent.includes('$') ? el.textContent : null;
      }).catch(() => null);

      if (!priceText) {
        // Fallback: if we can't find price on tile, we must navigate (riskier)
        await page.goto(fullUrl, { waitUntil: "domcontentloaded" });
        await wait(1000, 2000);
        const detailPrice = await page.$eval("span[class*='Price'], h1 + span", (el: any) => el.innerText).catch(() => null);
        if (!detailPrice) return null;
        var finalPrice = parseFloat(detailPrice.replace(/[^0-9.]/g, ""));
      } else {
        var finalPrice = parseFloat(priceText.replace(/[^0-9.]/g, ""));
      }

      console.log(`✅ OfferUp: $${finalPrice} — ${title}`);

      return {
        price: finalPrice,
        url: fullUrl,
        condition: "Used",
        title: title,
        image_url: imageUrl,
        ticker: keyword
      };
    } catch (err) {
      console.error("❌ OfferUp Scrape Error:", err);
      return null;
    }
  },
};
