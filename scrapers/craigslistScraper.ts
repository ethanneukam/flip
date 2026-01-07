import { Scraper } from "../scripts/scrapeRunner";

const wait = (min = 500, max = 1500) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

export const craigslistScraper: Scraper = {
  source: "Craigslist",

  scrape: async (page: any, keyword: string) => {
    try {
      // 1. Search Query
      const searchUrl = `https://www.craigslist.org/search/sss?query=${encodeURIComponent(keyword)}`;
      
      await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded", 
        timeout: 30000 
      });

      // 2. Wait for the result containers
      // Craigslist uses cl-search-result for modern and result-row for legacy
      await page.waitForSelector(".cl-search-result, .result-row", { timeout: 10000 }).catch(() => null);

      // 3. Select ALL result items
      const items = await page.$$(".cl-search-result, .result-row");
      
      console.log(`    📊 [Craigslist] Found ${items.length} potential local listings.`);

      const results: any[] = [];

      for (const item of items) {
        try {
          const data = await item.evaluate((el: any) => {
            // Modern Selectors
            const titleEl = el.querySelector(".titlestring, .result-title");
            const priceEl = el.querySelector(".priceinfo, .result-price");
            const linkEl = el.querySelector("a");
            const imgEl = el.querySelector("img");

            return {
              title: titleEl ? titleEl.innerText.trim() : "Used Asset",
              priceText: priceEl ? priceEl.innerText : null,
              url: linkEl ? linkEl.getAttribute("href") : null,
              imageUrl: imgEl ? imgEl.src : null
            };
          });

          // Validation: Craigslist has many "Price on Request" or $1 bait listings
          if (data.priceText && data.url) {
            const cleanPrice = parseFloat(data.priceText.replace(/[^0-9.]/g, ""));
            
            // Filter out obvious spam ($0, $1, $123456)
            if (!isNaN(cleanPrice) && cleanPrice > 5 && cleanPrice < 1000000) {
              results.push({
                price: cleanPrice,
                url: data.url,
                condition: "Used",
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

      console.log(`    ✅ [Craigslist] Extracted ${results.length} valid listings.`);
      return results;

    } catch (err: any) {
      console.log("❌ Craigslist Scrape Error:", err.message);
      return null;
    }
  },
};
