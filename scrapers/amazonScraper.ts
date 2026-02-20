import { Scraper } from "../scripts/scrapeRunner";

export const amazonScraper: Scraper = {
  source: "Amazon",

  scrape: async (page: any, keyword: string, tld: string = ".com") => {
    try {
      const baseUrl = `https://www.amazon${tld}`;
      const searchUrl = `${baseUrl}/s?k=${encodeURIComponent(keyword)}`;
      
      await page.goto(searchUrl, { 
        waitUntil: "networkidle", 
        timeout: 45000 
      });

      if (await page.$("form[action='/errors/validateCaptcha']")) {
        console.log("⚠️ [Amazon] Captcha Blocked.");
        return null;
      }

      try {
        await page.waitForSelector('.s-result-item', { timeout: 15000 });
      } catch (e) {
        console.log("⚠️ [Amazon] Results did not appear within 15s.");
        return [];
      }

      const results = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.s-result-item[data-component-type="s-search-result"]'));
        
        return items.map(el => {
          // BROAD SELECTORS: Amazon often swaps these classes
          const titleEl = el.querySelector('h2 a span') || el.querySelector('h2 span');
          const priceWhole = el.querySelector('.a-price-whole');
          const priceFraction = el.querySelector('.a-price-fraction');
          const offscreenPrice = el.querySelector('.a-price .a-offscreen');
          const linkEl = el.querySelector('h2 a');
          const asin = el.getAttribute('data-asin');

          // Price Logic: Try offscreen text first, then build from whole/fraction
          let priceText = offscreenPrice ? offscreenPrice.textContent : null;
          if (!priceText && priceWhole) {
            priceText = `${priceWhole.textContent}${priceFraction?.textContent || "00"}`;
          }

          return {
            title: titleEl?.textContent?.trim() || "Unknown",
            rawPrice: priceText,
            url: linkEl ? (linkEl as HTMLAnchorElement).href : null,
            asin: asin
          };
        });
      });

      const filteredResults = results
        .filter(item => item.rawPrice && item.asin) 
        .map(item => {
          // --- THE CRITICAL PRICE FIX ---
          // 1. Remove currency symbols
          // 2. Remove commas (thousands separators)
          // 3. Keep the dot for decimals
          let cleanPriceStr = item.rawPrice.replace(/[^\d.,]/g, "");
          
          // Logic for US/UK/JP (Comma as separator, dot as decimal)
          // If there is both a comma and a dot, remove the comma.
          if (cleanPriceStr.includes(',') && cleanPriceStr.includes('.')) {
            cleanPriceStr = cleanPriceStr.replace(/,/g, "");
          } else if (cleanPriceStr.includes(',') && cleanPriceStr.indexOf(',') < cleanPriceStr.length - 3) {
             // If comma is just a separator (e.g., 2,695)
             cleanPriceStr = cleanPriceStr.replace(/,/g, "");
          }

          const cleanPrice = parseFloat(cleanPriceStr);
          
          const productUrl = (item.url && typeof item.url === 'string' && item.url.startsWith('http'))
            ? item.url
            : `${baseUrl}/dp/${item.asin}`;

          return {
            price: cleanPrice,
            url: productUrl,
            condition: "New",
            // Fallback to keyword if title is still unknown to prevent loop skip
            title: (item.title === "Unknown" || !item.title) ? keyword : item.title,
            ticker: keyword
          };
        })
        .filter(item => !isNaN(item.price) && item.price > 0);

      console.log(`    ✅ [Amazon ${tld}] Successfully scraped ${filteredResults.length} items.`);
      return filteredResults;

    } catch (err: any) {
      console.log(`❌ Amazon [${tld}] Scrape Error:`, err.message);
      return null;
    }
  },
};
