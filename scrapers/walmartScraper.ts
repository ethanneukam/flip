import UserAgent from "user-agents";
import { Scraper } from "../scripts/scrapeRunner";

const wait = (min = 500, max = 1500) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

async function humanScroll(page: any) {
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, Math.random() * 800 + 400);
    await wait(400, 900);
  }
}

export const walmartScraper: Scraper = {
  source: "Walmart",

  scrape: async (page: any, keyword: string) => {
    try {
      const ua = new UserAgent({ deviceCategory: 'desktop' }).toString();

      await page.setExtraHTTPHeaders({
        "user-agent": ua,
        "accept-language": "en-US,en;q=0.9",
        "referer": "https://www.google.com/"
      });

      const searchUrl = `https://www.walmart.com/search?q=${encodeURIComponent(keyword)}`;
      console.log(`    🔍 [Walmart] Scanning search results for: "${keyword}"`);

      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      // Walmart often shows a "Verify you are human" press-and-hold button here.
      // This wait allows scripts to settle.
      await wait(3000, 5000);
      await humanScroll(page);

      // Select ALL organic product containers
      // Walmart usually uses [data-testid='variant-tile'] or [data-item-id]
      const productHandles = await page.$$("[data-item-id]");
      
      console.log(`    📊 [Walmart] Found ${productHandles.length} potential items.`);

      const results: any[] = [];

      for (const handle of productHandles) {
        try {
          const data = await handle.evaluate((el: any) => {
            const titleEl = el.querySelector("span[itemprop='name']") || el.querySelector("[data-automation='product-title']");
            const priceEl = el.querySelector("[data-automation='product-price']");
            const imgEl = el.querySelector("img");
            const linkEl = el.querySelector("a");

            return {
              title: titleEl ? titleEl.innerText.trim() : "Walmart Asset",
              url: linkEl ? linkEl.getAttribute("href") : null,
              priceText: priceEl ? priceEl.innerText : null,
              imageUrl: imgEl ? imgEl.src : null
            };
          });

          if (data.priceText && data.url) {
            // Walmart priceText can be "$12.99" or "Now $12.99"
            const cleanPrice = parseFloat(data.priceText.replace(/[^0-9.]/g, ""));
            
            if (!isNaN(cleanPrice) && cleanPrice > 0) {
              results.push({
                price: cleanPrice,
                url: data.url.startsWith("http") ? data.url : `https://www.walmart.com${data.url}`,
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

      console.log(`    ✅ [Walmart] Extracted ${results.length} valid listings.`);
      return results;

    } catch (err: any) {
      console.error("❌ Walmart Scrape Error:", err.message);
      return null;
    }
  },
};
