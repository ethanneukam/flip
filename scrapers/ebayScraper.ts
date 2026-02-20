import { Page } from "playwright";
import { Scraper } from "../scripts/scrapeRunner"; 

export const ebayScraper: Scraper = {
  source: "eBay",

  // Added tld support to match your Amazon node strategy
  scrape: async (page: Page, keyword: string, tld: string = ".com") => {
    try {
      // 1. Construct URL - Flexible TLD for international scanning
      // LH_BIN=1 (Buy It Now), LH_ItemCondition=3 (Used)
      const baseUrl = `https://www.ebay${tld}`;
      const url = `${baseUrl}/sch/i.html?_nkw=${encodeURIComponent(keyword)}&LH_BIN=1&LH_ItemCondition=3&_sop=10`;
      
      console.log(`    🔍 [eBay] Scanning search results: "${keyword}"`);

      // 2. Navigation - networkidle is safer for eBay's heavy scripts
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      
      // 3. Resilient Selector: eBay often changes the parent container, 
      // but the price class is very stable.
      try {
        await page.waitForSelector('.s-item__price', { timeout: 8000 });
      } catch {
        console.log('    ⚠️ [eBay] No results found on page (Selector Timeout).');
        return [];
      }

      // 4. Extract Data
      const rawItems = await page.evaluate(() => {
        // Broadened the selector to find items regardless of the "River" container name
        const items = Array.from(document.querySelectorAll('.s-item'));
        const extracted: any[] = [];

        items.forEach((el) => {
          // Skip the "Shop on eBay" header/placeholder item
          if (el.querySelector('.s-item__title--tagblock')) return;

          const titleEl = el.querySelector(".s-item__title");
          const priceEl = el.querySelector(".s-item__price");
          const linkEl = el.querySelector("a.s-item__link") as HTMLAnchorElement;
          const imgEl = el.querySelector(".s-item__image-img img") as HTMLImageElement;
          
          if (titleEl && priceEl && !titleEl.textContent?.includes("Shop on eBay")) {
            extracted.push({
              title: titleEl.textContent?.replace("New Listing", "").trim() || "Unknown",
              priceText: priceEl.textContent?.trim(),
              url: linkEl?.href || "",
              imageUrl: imgEl?.src || "",
              condition: "Used"
            });
          }
        });
        return extracted;
      });

      // 5. Process and Clean Data
      const results: any[] = [];

      for (const item of rawItems) {
        if (!item.priceText) continue;

        // FIXED REGEX: Now handles any currency symbol ($, £, €, etc.)
        // It captures the digits and decimals regardless of the prefix
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
  }
};          if (titleEl && priceEl) {
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
