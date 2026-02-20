import { Page } from "playwright";
import { Scraper } from "../scripts/scrapeRunner"; 

export const ebayScraper: Scraper = {
  source: "eBay",

  scrape: async (page: Page, keyword: string, tld: string = ".com") => {
    // STABILITY GUARD: Don't start if the page was already closed by the runner
    if (page.isClosed()) return [];

    try {
      const baseUrl = `https://www.ebay${tld}`;
      const url = `${baseUrl}/sch/i.html?_nkw=${encodeURIComponent(keyword)}&LH_BIN=1&LH_ItemCondition=3&_sop=10`;
      
      console.log(`    🔍 [eBay] Scanning search results: "${keyword}"`);

      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      
      if (page.isClosed()) return []; // Double check after long navigation

      try {
        await page.waitForSelector('.s-item__price', { timeout: 8000 });
      } catch {
        console.log('    ⚠️ [eBay] No results found on page (Selector Timeout).');
        return [];
      }

      const rawItems = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.s-item'));
        const extracted: any[] = [];

        items.forEach((el) => {
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

      const results: any[] = [];
      for (const item of rawItems) {
        if (!item.priceText) continue;
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
      if (err.message.includes("closed")) {
        console.log("    ⚠️ [eBay] Browser closed before scrape finished.");
        return [];
      }
      console.error(`    ❌ eBay Scrape Error: ${err.message}`);
      return [];
    }
  }
};
