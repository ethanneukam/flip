import { Page } from "playwright";
import { Scraper } from "../scripts/scrapeRunner"; 

export const ebayScraper: Scraper = {
  source: "eBay",

  scrape: async (page: Page, keyword: string, tld: string = ".com") => {
    try {
      // 1. Construct URL
      const baseUrl = `https://www.ebay${tld}`;
      const url = `${baseUrl}/sch/i.html?_nkw=${encodeURIComponent(keyword)}&LH_BIN=1&LH_ItemCondition=3&_sop=10`;
      
      console.log(`    🔍 [eBay] Scanning search results: "${keyword}"`);

      // 2. Navigation
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      
      // 3. Resilient Selector
      try {
        await page.waitForSelector('.s-item__price', { timeout: 8000 });
      } catch {
        console.log('    ⚠️ [eBay] No results found on page (Selector Timeout).');
        return [];
      }

      // 4. Extract Data
      const rawItems = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.s-item'));
        const extracted: any[] = [];

        items.forEach((el) => {
          // Skip placeholders/ads
          if (el.querySelector('.s-item__title--tagblock')) return;

          const titleEl = el.querySelector(".s-item__title");
          const priceEl = el.querySelector(".s-item__price");
          const linkEl = el.querySelector("a.s-item__link") as HTMLAnchorElement;
          const imgEl = el.querySelector(".s-item__image-img img") as HTMLImageElement;
          
          if (titleEl && priceEl) {
            const titleText = titleEl.textContent?.replace("New Listing", "").trim() || "Unknown";
            if (!titleText.includes("Shop on eBay")) {
              extracted.push({
                title: titleText,
                priceText: priceEl.textContent?.trim(),
                url: linkEl?.href || "",
                imageUrl: imgEl?.src || "",
                condition: "Used"
              });
            }
          }
        });
        return extracted;
      });

      // 5. Process and Clean Data
      const results: any[] = [];

      for (const item of rawItems) {
        if (!item.priceText) continue;

        // Clean price: removes currency symbols and commas
        const priceMatch = item.priceText.replace(/[^\d.,]/g, "").replace(",", "");
        const cleanPrice = parseFloat(priceMatch);

        if (!isNaN(cleanPrice) && cleanPrice > 1) {
          results.push({
            price: cleanPrice,
            title: item.title,
            url: item.url,
            image_url: item.imageUrl,
            source: "eBay",
            ticker: keyword,
            condition: item.condition
          });
        }
      }

      console.log(`    ✅ [eBay] Extracted ${results.length} valid listings.`);
      return results;

    } catch (err: any) {
      console.error(`    ❌ eBay Scrape Error: ${err.message}`);
      return [];
    }
  } // End of scrape function
}; // End of ebayScraper object
