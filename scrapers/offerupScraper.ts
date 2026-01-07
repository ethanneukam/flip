import { Scraper } from "../scripts/scrapeRunner";

const wait = (min = 500, max = 1500) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

async function applyFingerprintSpoofing(page: any) {
  await page.addInitScript(() => {
    // Hidden standard: hiding the fact that this is a bot
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
      console.log(`    🔍 [OfferUp] Scanning marketplace: "${keyword}"`);

      await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded", 
        timeout: 50000 
      });

      // OfferUp is slow to render its "infinite grid"
      await wait(3000, 5000);

      // Select ALL listing tiles
      const itemHandles = await page.$$("a[href*='/item/detail/']");
      
      console.log(`    📊 [OfferUp] Found ${itemHandles.length} potential local listings.`);

      const results: any[] = [];

      for (const handle of itemHandles) {
        try {
          const data = await handle.evaluate((el: any) => {
            const imgEl = el.querySelector("img");
            // OfferUp titles are usually in the alt text of the image or a nearby div
            const title = imgEl ? imgEl.getAttribute("alt") : "Used Asset";
            const imageUrl = imgEl ? imgEl.getAttribute("src") : null;
            const url = el.getAttribute("href");

            // Price extraction: OfferUp often hides price in a span inside the tile
            // We search for the first element containing a "$"
            const priceEl = Array.from(el.querySelectorAll('span, div'))
              .find((node: any) => node.innerText.includes('$'));

            return {
              title,
              imageUrl,
              url,
              priceText: priceEl ? (priceEl as HTMLElement).innerText : null
            };
          });

          if (data.priceText && data.url) {
            const cleanPrice = parseFloat(data.priceText.replace(/[^0-9.]/g, ""));
            
            if (!isNaN(cleanPrice) && cleanPrice > 0) {
              results.push({
                price: cleanPrice,
                url: data.url.startsWith("http") ? data.url : `https://offerup.com${data.url}`,
                condition: "Used",
                title: data.title,
                image_url: data.imageUrl,
                ticker: keyword
              });
            }
          }
        } catch (e) { continue; }
      }

      console.log(`    ✅ [OfferUp] Extracted ${results.length} valid listings.`);
      return results;

    } catch (err: any) {
      console.error("❌ OfferUp Scrape Error:", err.message);
      return null;
    }
  },
};
