import { Scraper } from "../scripts/scrapeRunner"; // Ensure this path points to your runner

const wait = (min = 500, max = 1500) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

export const amazonScraper: Scraper = {
  source: "Amazon",

  scrape: async (page: any, keyword: string) => {
    try {
      const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}&ref=nb_sb_noss`;
      
      await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded", 
        timeout: 30000 
      });

      // 1. CAPTCHA Check
      if (await page.$("form[action='/errors/validateCaptcha']")) {
        throw new Error("CAPTCHA_BLOCK");
      }

      // 2. Wait for the results grid to load
      await page.waitForSelector('.s-result-item[data-component-type="s-search-result"]', { timeout: 10000 });

      // 3. Select ALL organic result items on the page
      const products = await page.$$('.s-result-item[data-component-type="s-search-result"]');
      
      console.log(`    📊 [Amazon] Found ${products.length} potential items on page.`);

      const results: any[] = [];

      for (const product of products) {
        try {
          // Extract data for each specific product handle
          const data = await product.evaluate((el: any) => {
            const titleEl = el.querySelector('h2 a span');
            const priceEl = el.querySelector('.a-price .a-offscreen');
            const imgEl = el.querySelector('img.s-image');
            const asin = el.getAttribute('data-asin');
            
            // Handle split prices (whole + fraction) if offscreen text is missing
            let priceText = priceEl ? priceEl.innerText : null;
            if (!priceText) {
              const whole = el.querySelector('.a-price-whole')?.innerText || "";
              const fraction = el.querySelector('.a-price-fraction')?.innerText || "";
              priceText = whole ? `${whole}.${fraction}` : null;
            }

            return {
              title: titleEl ? titleEl.innerText.trim() : "Unknown Asset",
              rawPrice: priceText,
              imageUrl: imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src')) : null,
              asin: asin
            };
          });

          // Only push if there is a valid price and ASIN
          if (data.rawPrice && data.asin) {
            const cleanPrice = parseFloat(data.rawPrice.replace(/[^0-9.]/g, ""));
            if (!isNaN(cleanPrice)) {
              results.push({
                price: cleanPrice,
                url: `https://www.amazon.com/dp/${data.asin}`,
                condition: "New",
                title: data.title,
                image_url: data.imageUrl,
                ticker: keyword
              });
            }
          }
        } catch (itemErr) {
          // Skip individual items that fail to parse without crashing the whole scraper
          continue;
        }
      }

      console.log(`    ✅ [Amazon] Successfully scraped ${results.length} organic items.`);
      return results;

    } catch (err: any) {
      console.log("❌ Amazon Scrape Error:", err.message);
      return null;
    }
  },
};
