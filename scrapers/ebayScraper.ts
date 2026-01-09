import { Page } from "playwright";
import { Scraper } from "../scrapeRunner"; 

export const ebayScraper: Scraper = {
  source: "eBay",

  scrape: async (page: Page, keyword: string) => {
    try {
      // 1. Construct URL (Buy It Now + Sort by Newly Listed usually gives best market signal)
      const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keyword)}&_sacat=0&LH_BIN=1&LH_ItemCondition=3`;
      console.log(`    🔍 [eBay] Scanning search results: "${keyword}"`);

      // 2. Navigation with longer timeout
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      
      // 3. Safety Wait (replaces humanMouse)
      // Just waiting is safer than moving the mouse in headless mode
      try {
        await page.waitForSelector('.s-item__price', { timeout: 5000 });
      } catch {
        console.log('    ⚠️ [eBay] No results found on page.');
        return [];
      }

      // 4. Extract ALL data in one go (The "Pro" Way)
      // This prevents "Execution Context Destroyed" or "Target Crashed" errors
      const rawItems = await page.evaluate(() => {
        const items = document.querySelectorAll('.srp-results .s-item:not(.s-item--placeholder)');
        const extracted: any[] = [];

        items.forEach((el) => {
          const titleEl = el.querySelector(".s-item__title");
          const priceEl = el.querySelector(".s-item__price");
          const linkEl = el.querySelector("a.s-item__link") as HTMLAnchorElement;
          const imgEl = el.querySelector(".s-item__image-img img") as HTMLImageElement;
          
          if (titleEl && priceEl) {
            extracted.push({
              title: titleEl.textContent?.replace("New Listing", "").trim() || "Unknown",
              priceText: priceEl.textContent?.trim(),
              url: linkEl?.href || "",
              imageUrl: imgEl?.src || "",
              condition: "Used" // eBay "LH_ItemCondition=3" in URL ensures these are used/pre-owned
            });
          }
        });
        return extracted;
      });

      console.log(`    📊 [eBay] Found ${rawItems.length} raw items. Parsing prices...`);

      // 5. Process and Clean Data
      const results: any[] = [];

      for (const item of rawItems) {
        if (!item.priceText) continue;

        // Robust Regex: Handles "$1,200.00", "$50", and "$10.50 to $20.00"
        // It grabs the FIRST number found in the string.
        const match = item.priceText.match(/\$([0-9,]+(\.[0-9]{2})?)/);
        
        if (match) {
          // Remove commas and convert to float
          const cleanPrice = parseFloat(match[1].replace(/,/g, ''));

          if (!isNaN(cleanPrice) && cleanPrice > 1) { // Filter out $0.99 junk
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
      }

      console.log(`    ✅ [eBay] Extracted ${results.length} valid listings.`);
      return results;

    } catch (err: any) {
      // Catch-all to prevent scraper from stopping the whole runner
      console.error(`    ❌ eBay Scrape Error: ${err.message}`);
      return []; // Return empty array instead of null to prevent iteration errors upstream
    }
  }
};
