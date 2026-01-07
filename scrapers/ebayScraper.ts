import { Page } from "playwright";
import UserAgent from "user-agents";
import { Scraper } from "../scripts/scrapeRunner"; // Restored import path

const wait = (min = 500, max = 1500) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

async function humanMouse(page: Page) {
  const size = page.viewportSize();
  if (!size) return;
  for (let i = 0; i < 3; i++) {
    const x = Math.random() * size.width;
    const y = Math.random() * size.height;
    await page.mouse.move(x, y, { steps: 5 });
    await wait(100, 300);
  }
}

export const ebayScraper: Scraper = {
  source: "eBay",

  scrape: async (page: Page, keyword: string) => {
    try {
      const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keyword)}&_sop=15`;
      console.log(`    🔍 [eBay] Scanning search results: "${keyword}"`);

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await wait(1000, 2000);
      await humanMouse(page);

      // Wait for the results container
      await page.waitForSelector(".srp-results", { timeout: 10000 });

      // Select ALL result cards (excluding placeholders)
      const itemHandles = await page.$$(".srp-results .s-item:not(.s-item--placeholder)");
      
      console.log(`    📊 [eBay] Found ${itemHandles.length} potential listings.`);

      const results: any[] = [];

      for (const handle of itemHandles) {
        try {
          const data = await handle.evaluate((el: any) => {
            const titleEl = el.querySelector(".s-item__title");
            const priceEl = el.querySelector(".s-item__price");
            const linkEl = el.querySelector("a.s-item__link");
            const imgEl = el.querySelector(".s-item__image-img img");
            const conditionEl = el.querySelector(".s-item__subtitle .SECONDARY_INFO") || el.querySelector(".s-item__subtitle");

            return {
              title: titleEl ? titleEl.innerText.replace("New Listing", "").trim() : "Unknown Asset",
              priceText: priceEl ? priceEl.innerText : null,
              url: linkEl ? linkEl.href : null,
              imageUrl: imgEl ? imgEl.src : null,
              condition: conditionEl ? conditionEl.innerText.trim() : "Used"
            };
          });

          if (data.priceText && data.url) {
            // eBay prices can look like "$10.00 to $20.00", we take the first/lowest number
            const priceMatch = data.priceText.replace(/,/g, "").match(/([0-9]+\.[0-9]{2})/);
            const price = priceMatch ? parseFloat(priceMatch[1]) : null;

            if (price && price > 0) {
              results.push({
                price,
                url: data.url,
                condition: data.condition,
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

      console.log(`    ✅ [eBay] Extracted ${results.length} valid listings.`);
      return results;

    } catch (err: any) {
      console.error("❌ eBay Scrape Error:", err.message);
      return null;
    }
  }
};
