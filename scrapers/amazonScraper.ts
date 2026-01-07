import { Scraper } from "./types";

const wait = (min = 500, max = 1500) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

export const amazonScraper: Scraper = {
  source: "Amazon",

  scrape: async (page: any, keyword: string) => {
    try {
      // 1. Direct Search URL (Bypasses typing detection and saves 5 seconds)
      const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}&ref=nb_sb_noss`;
      
      await page.goto(searchUrl, { 
        waitUntil: "commit", // Faster than domcontentloaded
        timeout: 30000 
      });

      // 2. Immediate CAPTCHA Check
      const isCaptcha = await page.$("form[action='/errors/validateCaptcha']");
      if (isCaptcha) {
        throw new Error("CAPTCHA_BLOCK");
      }

      // 3. Wait for results with a short timeout
      await page.waitForSelector(".s-result-item", { timeout: 10000 });

      // 4. Robust Item Selection
      // We target the first organic result that isn't an advertisement (ad-unit)
      const product = await page.$('.s-result-item[data-component-type="s-search-result"]');
      
      if (!product) {
        console.log("⚠️ Amazon: No organic results found.");
        return null;
      }

      // 5. Data Extraction with Fallbacks
      const [asin, title, imageUrl, rawPrice] = await Promise.all([
        product.getAttribute("data-asin"),
        product.$eval('h2 a span', (el: any) => el.textContent?.trim()).catch(() => "Unknown Asset"),
        // Get image URL from attributes since we block the actual load
        product.$eval('img.s-image', (el: any) => el.getAttribute('src') || el.getAttribute('data-src')).catch(() => null),
        product.$eval('.a-price .a-offscreen', (el: any) => el.textContent).catch(async () => {
          // Fallback to combined whole and fraction
          const whole = await product.$eval('.a-price-whole', (el: any) => el.textContent).catch(() => "");
          const fraction = await product.$eval('.a-price-fraction', (el: any) => el.textContent).catch(() => "");
          return whole ? `${whole}${fraction}` : null;
        })
      ]);

      if (!rawPrice) return null;

      // Clean price string: "$1,299.99" -> 1299.99
      const price = parseFloat(rawPrice.replace(/[^0-9.]/g, ""));
      const url = `https://www.amazon.com/dp/${asin}`;

      console.log(`✅ [Amazon] $${price} | ${asin}`);

      return { 
        price, 
        url, 
        condition: "New", 
        title, 
        image_url: imageUrl, 
        ticker: keyword 
      };

    } catch (err: any) {
      if (err.message === "CAPTCHA_BLOCK") {
        console.log("❌ Amazon: Blocked by CAPTCHA. Rotation required.");
      } else {
        console.log("❌ Amazon Scrape Error:", err.message);
      }
      return null;
    }
  },
};
