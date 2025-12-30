import { Page } from "playwright";
import UserAgent from "user-agents";
import { Scraper } from "./types";

const wait = (min = 120, max = 450) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

async function humanMouse(page: Page) {
  const { width = 1200, height = 800 } = page.viewportSize() || {};
  for (let i = 0; i < 4; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 6) + 4 });
    await wait(80, 220);
  }
}

async function humanScroll(page: Page) {
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, Math.random() * 600 + 100);
    await wait(300, 800);
  }
}

export const ebayScraper: Scraper = {
  source: "eBay",

  scrape: async (page: Page, keyword: string) => {
    try {
      const ua = new UserAgent().toString();
      await page.setExtraHTTPHeaders({
        "user-agent": ua,
        "accept-language": "en-US,en;q=0.9"
      });

      await page.setViewportSize({
        width: 1200 + Math.floor(Math.random() * 100),
        height: 800 + Math.floor(Math.random() * 100)
      });

      const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keyword)}&_sop=15`; // _sop=15 sorts by "Best Match"
      console.log("🔍 eBay search:", url);

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

      await wait(800, 1600);
      await humanMouse(page);
      await humanScroll(page);

      await page.waitForSelector(".srp-results", { timeout: 10000 });

      // Logic: Skip the first "placeholder" item if it exists and find the first real result card
      const product = await page.$(".srp-results .s-item:not(.s-item--placeholder)");
      
      if (!product) {
        console.log("⚠️ eBay: no product found");
        return null;
      }

      // --- METADATA EXTRACTION ---
      const title = await product.$eval(".s-item__title", (el: any) => el.textContent?.trim()).catch(() => "Unknown Asset");
      const imageUrl = await product.$eval(".s-item__image-img img", (el: any) => el.src).catch(() => null);

      const productUrl = await product
        .$eval("a.s-item__link", (a: any) => a.href)
        .catch(() => null);

      const priceText = await product
        .$eval(".s-item__price", (el: any) => el.textContent)
        .catch(() => null);

      if (!priceText) {
        console.log("⚠️ eBay: price not found");
        return null;
      }

      const priceNumMatch = priceText
        .replace(/,/g, "")
        .match(/([0-9]+(?:\.[0-9]{1,2})?)/);

      const price = priceNumMatch ? parseFloat(priceNumMatch[1]) : null;

      if (!price) {
        console.log("⚠️ eBay: could not parse price");
        return null;
      }

      const condition =
        (await product
          .$eval(".s-item__subtitle .SECONDARY_INFO", el => el.textContent)
          .catch(() => null)) ||
        (await product
          .$eval(".s-item__subtitle", el => el.textContent)
          .catch(() => "")) ||
        "Unknown";

      await humanMouse(page);
      await humanScroll(page);

      console.log(`✅ eBay: $${price} — ${title}`);

      return {
        price,
        url: productUrl || url,
        condition: condition.trim(),
        title,
        image_url: imageUrl,
        ticker: keyword
      };
    } catch (err) {
      console.error("❌ eBay scrape error:", err);
      return null;
    }
  }
};
