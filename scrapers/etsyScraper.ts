import { Scraper } from "../scripts/scrapeRunner";

const wait = (min = 500, max = 1500) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

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
      console.log(`    🔍 [Etsy] Scanning search results for: "${keyword}"`);

      await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded",
        timeout: 45000 
      });

      // Etsy often has a "Privacy/Cookies" overlay; waiting helps it settle
      await wait(2000, 3500);

      // Wait for the grid to appear
      await page.waitForSelector(".v2-listing-card", { timeout: 15000 }).catch(() => null);

      // Select ALL organic listings (skipping potential display-none placeholders)
      const itemHandles = await page.$$(".v2-listing-card:not(.wt-display-none)");
      
      console.log(`    📊 [Etsy] Found ${itemHandles.length} total listings on page.`);

      const results: any[] = [];

      for (const handle of itemHandles) {
        try {
          const data = await handle.evaluate((el: any) => {
            const titleEl = el.querySelector(".v2-listing-card__title") || el.querySelector("h3");
            const priceEl = el.querySelector(".currency-value");
            const linkEl = el.querySelector("a.listing-link");
            const imgEl = el.querySelector("img.wt-width-full") || el.querySelector("img");

            return {
              title: titleEl ? titleEl.innerText.trim() : "Handmade Asset",
              priceText: priceEl ? priceEl.innerText : null,
              url: linkEl ? linkEl.getAttribute("href") : null,
              imageUrl: imgEl ? (imgEl.getAttribute("src") || imgEl.getAttribute("data-src")) : null
            };
          });

          if (data.priceText && data.url) {
            const cleanPrice = parseFloat(data.priceText.replace(/[^0-9.]/g, ""));
            
            if (!isNaN(cleanPrice) && cleanPrice > 0) {
              results.push({
                price: cleanPrice,
                url: data.url.split('?')[0], // Remove tracking garbage
                condition: "Handmade/Vintage",
                title: data.title,
                image_url: data.imageUrl,
                ticker: keyword
              });
            }
          }
        } catch (itemErr) {
          continue; // Skip individual card failures
        }
      }

      console.log(`    ✅ [Etsy] Extracted ${results.length} valid listings.`);
      return results;

    } catch (err: any) {
      console.error("❌ Etsy Scrape Error:", err.message);
      return null;
    }
  },
};
