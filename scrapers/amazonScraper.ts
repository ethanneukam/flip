import { Scraper } from "../scripts/scrapeRunner";

export const amazonScraper: Scraper = {
  source: "Amazon",

  scrape: async (page: any, keyword: string, tld: string = ".com") => {
    try {
      // FIX: Dynamically build the URL based on the Node's TLD (.com, .co.uk, .de, etc.)
      const baseUrl = `https://www.amazon${tld}`;
      const searchUrl = `${baseUrl}/s?k=${encodeURIComponent(keyword)}`;
      
      await page.goto(searchUrl, { 
        waitUntil: "networkidle", // Wait for network to settle
        timeout: 45000 
      });

      // 1. CAPTCHA Check
      if (await page.$("form[action='/errors/validateCaptcha']")) {
        console.log("⚠️ [Amazon] Captcha Blocked.");
        return null;
      }

      // 2. Robust Selector: Wait for items OR the "no results" container
      try {
        await page.waitForSelector('.s-result-item', { timeout: 15000 });
      } catch (e) {
        console.log("⚠️ [Amazon] Results did not appear within 15s.");
        return [];
      }

      // 3. Extract items
      const results = await page.evaluate((base) => {
        // Use a broader selector for items
        const items = Array.from(document.querySelectorAll('.s-result-item[data-component-type="s-search-result"]'));
        
        return items.map(el => {
          const titleEl = el.querySelector('h2 a span');
          const priceEl = el.querySelector('.a-price .a-offscreen');
          const linkEl = el.querySelector('h2 a');
          
          let priceText = priceEl ? (priceEl as HTMLElement).innerText : null;
          // Fallback for different regions
          if (!priceText) {
            const whole = el.querySelector('.a-price-whole')?.textContent || "";
            const fraction = el.querySelector('.a-price-fraction')?.textContent || "";
            priceText = whole ? `${whole}.${fraction}` : null;
          }

          const asin = el.getAttribute('data-asin');

          return {
            title: titleEl?.textContent?.trim() || "Unknown",
            rawPrice: priceText,
            url: linkEl ? (linkEl as HTMLAnchorElement).href : null,
            asin: asin
          };
        });
      }, baseUrl);

 const filteredResults = results
        .filter(item => item.rawPrice && item.asin) // Keep only items with price/ASIN
        .map(item => {
          // 1. Improved Price Cleaning (handles "£", "¥", "$", and EU comma decimals)
          const cleanPrice = parseFloat(item.rawPrice.replace(/[^\d.,]/g, "").replace(",", "."));
          
          // 2. SAFE URL Check: Use the scraped URL if it exists, otherwise build it via ASIN
          // This prevents the 'startsWith' on null error
          const productUrl = (item.url && typeof item.url === 'string' && item.url.startsWith('http'))
            ? item.url
            : `${baseUrl}/dp/${item.asin}`;

          return {
            price: cleanPrice,
            url: productUrl,
            condition: "New",
            title: item.title || "Unknown Product",
            ticker: keyword
          };
        })
        .filter(item => !isNaN(item.price));

      console.log(`    ✅ [Amazon ${tld}] Successfully scraped ${filteredResults.length} items.`);
      return filteredResults;

    } catch (err: any) {
      console.log(`❌ Amazon [${tld}] Scrape Error:`, err.message);
      return null;
    }
  },
};
