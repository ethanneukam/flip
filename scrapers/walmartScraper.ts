import UserAgent from "user-agents";
import { Scraper } from "../lib/scraper-types.js"; // Standardized import

const wait = (min = 500, max = 1500) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

export const walmartScraper: Scraper = {
  source: "Walmart",

  scrape: async (page: any, keyword: string) => {
    try {
      // User-Agent is already handled in scrapeRunner.ts via browser.newContext()!
      const searchUrl = `https://www.walmart.com/search?q=${encodeURIComponent(keyword)}&sort=relevance`;
      
      // We use 'domcontentloaded' because Walmart's tracking scripts take forever to 'load'
      const response = await page.goto(searchUrl, {
        waitUntil: "domcontentloaded", 
        timeout: 30000,
      });

      // 3. Immediate Bot Check
      const content = await page.content();
      if (content.includes("Verify you are human") || (response && response.status() === 403)) {
        console.error("  ⚠️ [Walmart] Blocked by PerimeterX (Captcha).");
        return null;
      }

      // 4. Wait for the Grid 
      try {
        await page.waitForSelector('[data-testid="item-stack"]', { timeout: 10000 });
      } catch (e) {
        console.log("  ⚠️ [Walmart] Search grid not found.");
        await page.waitForSelector('.mb0', { timeout: 5000 }).catch(() => {});
      }

      // 5. Execute everything in ONE context switch
      const results = await page.evaluate((kw: string) => {
        const items = Array.from(document.querySelectorAll('[data-testid="variant-tile"], [data-item-id], .mb0'));
        
        return items.slice(0, 15).map(el => {
          const titleEl = el.querySelector('[data-automation="product-title"], .f6-m, span[itemprop="name"]');
          const priceEl = el.querySelector('[data-automation="product-price"], .w_iN_0');
          const linkEl = el.querySelector('a');

          return {
            title: titleEl ? (titleEl as HTMLElement).innerText.trim() : null,
            priceRaw: priceEl ? (priceEl as HTMLElement).innerText : null,
            url: linkEl ? (linkEl as HTMLAnchorElement).href : null
          };
        }).filter(i => i.title && i.priceRaw);
      }, keyword);

      // 6. Clean data in Node.js
      const filteredResults = results.map((item: any) => {
        const priceMatch = item.priceRaw.match(/\$([0-9,]+\.[0-9]{2})/);
        const cleanPrice = priceMatch 
          ? parseFloat(priceMatch[1].replace(/,/g, '')) 
          : parseFloat(item.priceRaw.replace(/[^0-9.]/g, ''));

        return {
          price: cleanPrice,
          url: item.url,
          condition: "New",
          title: item.title,
          ticker: keyword
        };
      }).filter((item: any) => !isNaN(item.price) && item.price > 0);

      console.log(`    ✅ [Walmart] Extracted ${filteredResults.length} valid listings.`);
      return filteredResults;

    } catch (err: any) {
      console.error(`  ❌ [Walmart] Scrape Error: ${err.message}`);
      return []; 
    }
  },
};
