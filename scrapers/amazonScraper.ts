import UserAgent from "user-agents";
import { Scraper } from "./types";

const wait = (min = 120, max = 450) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

async function humanType(page: any, selector: string, text: string) {
  await page.click(selector, { delay: 100 });
  for (const char of text) {
    if (Math.random() < 0.08) {
      const typo = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      await page.type(selector, typo, { delay: Math.random() * 150 + 30 });
      await wait(80, 160);
      await page.keyboard.press("Backspace");
    }
    await page.type(selector, char, { delay: Math.random() * 120 + 20 });
    await wait(50, 180);
  }
}

async function applyFingerprintSpoofing(page: any) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "plugins", { get: () => [{ name: "Chrome PDF Plugin" }] });
  });
}

export const amazonScraper: Scraper = {
  source: "Amazon",

  scrape: async (page: any, keyword: string) => {
    try {
      await applyFingerprintSpoofing(page);
      
      // Navigate to Amazon
      await page.goto("https://www.amazon.com", { waitUntil: "domcontentloaded", timeout: 60000 });
      await wait(1000, 2000);

      // Detect Captcha immediately
      if (await page.$("form[action='/errors/validateCaptcha']")) {
        console.log("⚠️ Amazon CAPTCHA detected. Bypassing...");
        await page.reload(); // Simple reload often triggers a different node
        await wait(2000, 3000);
      }

      // If search box isn't there, we are blocked
      if (!(await page.$("#twotabsearchtextbox"))) {
        console.log("⚠️ Amazon Search box not found (Blocked).");
        return null;
      }

      await humanType(page, "#twotabsearchtextbox", keyword);
      await page.keyboard.press("Enter");

      await page.waitForSelector(".s-main-slot", { timeout: 15000 }).catch(() => null);

      const product = await page.$('.s-result-item[data-asin]:not([data-asin=""]):not([data-asin="0"])');
      if (!product) return null;

      const asin = await product.getAttribute("data-asin");
      const url = `https://www.amazon.com/dp/${asin}`;
      const title = await product.$eval('h2 a span', (el: any) => el.textContent?.trim()).catch(() => "Unknown");
      const imageUrl = await product.$eval('img.s-image', (el: any) => el.src).catch(() => null);

      const rawPrice = await product.$eval(".a-price .a-offscreen", (el: any) => el.textContent?.replace(/[^0-9.]/g, "")).catch(() => null);
      if (!rawPrice) return null;
      const price = parseFloat(rawPrice);

      console.log(`✅ Amazon: $${price} — ${title}`);
      return { price, url, condition: "New", title, image_url: imageUrl, ticker: keyword };
    } catch (err) {
      console.log("❌ Amazon Scrape Error:", err);
      return null;
    }
  },
};
