import fs from "fs";
import path from "path";
import { BrowserContext, Page, chromium } from "playwright";
import UserAgent from "user-agents";
import { ScraperResult, Scraper } from "../scripts/scrapeRunner";

const COOKIE_DIR = path.resolve(process.cwd(), ".fb_cookies");
if (!fs.existsSync(COOKIE_DIR)) fs.mkdirSync(COOKIE_DIR);

const wait = (min = 500, max = 1500) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

async function createOrRestoreContext(browser: any, profileId = "default", proxy?: string): Promise<BrowserContext> {
  const ua = new UserAgent({ deviceCategory: "mobile" }).toString();
  const context = await browser.newContext({
    userAgent: ua,
    viewport: { width: 390, height: 844 },
    locale: "en-US",
    ...(proxy ? { proxy: { server: proxy } } : {})
  });

  const cookieFile = path.join(COOKIE_DIR, `${profileId}.json`);
  if (fs.existsSync(cookieFile)) {
    const cookies = JSON.parse(fs.readFileSync(cookieFile, "utf-8"));
    await context.addCookies(cookies);
    console.log("    🔑 [FB] Restored session cookies.");
  }
  return context;
}

async function saveCookies(context: BrowserContext, profileId = "default") {
  try {
    const cookieFile = path.join(COOKIE_DIR, `${profileId}.json`);
    const cookies = await context.cookies();
    fs.writeFileSync(cookieFile, JSON.stringify(cookies, null, 2));
  } catch (e) { console.warn("    ⚠️ [FB] Failed to save cookies", e); }
}

export const facebookScraper: Scraper = {
  source: "Facebook Marketplace",

  scrape: async (page: Page, keyword: string): Promise<ScraperResult[] | null> => {
    let context: BrowserContext | null = null;
    try {
      const FB_EMAIL = process.env.FB_EMAIL;
      const FB_PASSWORD = process.env.FB_PASSWORD;
      const PROXY = process.env.SCRAPE_PROXY;

      if (!FB_EMAIL || !FB_PASSWORD) return null;

      const browser = (page as any).context()?.browser() || (await chromium.launch({ headless: true }));
      context = await createOrRestoreContext(browser, "default", PROXY);
      const fbPage = await context.newPage();

      // Navigate to search
      const searchUrl = `https://m.facebook.com/marketplace/search/?query=${encodeURIComponent(keyword)}`;
      console.log(`    🔍 [FB] Scanning mobile marketplace: "${keyword}"`);
      await fbPage.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
      
      // Small scroll to trigger lazy loading of the grid
      await fbPage.mouse.wheel(0, 800);
      await wait(2000, 4000);

      // Facebook uses a mix of role='article' and specific div structures for the grid
      const listingHandles = await fbPage.$$("div[role='article'], a[href*='/marketplace/item/']");
      
      console.log(`    📊 [FB] Found ${listingHandles.length} potential local listings.`);

      const results: ScraperResult[] = [];

      for (const handle of listingHandles) {
        try {
          const data = await handle.evaluate((el: any) => {
            // Mobile FB usually puts title in a span with line-clamp and price in a plain span
            const allSpans = Array.from(el.querySelectorAll('span'));
            const priceSpan = allSpans.find((s: any) => s.innerText.includes('$'));
            const imgEl = el.querySelector('img');
            const linkEl = el.tagName === 'A' ? el : el.querySelector('a[href*="/marketplace/item/"]');

            return {
              title: el.innerText.split('\n')[0] || "FB Listing",
              priceText: priceSpan ? (priceSpan as HTMLElement).innerText : null,
              url: linkEl ? linkEl.getAttribute('href') : null,
              imageUrl: imgEl ? imgEl.src : null
            };
          });

          if (data.priceText && data.url) {
            const cleanPrice = parseFloat(data.priceText.replace(/[^0-9.]/g, ""));
            
            if (!isNaN(cleanPrice) && cleanPrice > 0) {
              results.push({
                price: cleanPrice,
                url: data.url.startsWith("http") ? data.url : `https://m.facebook.com${data.url}`,
                condition: "Used",
                title: data.title,
                image_url: data.imageUrl,
                ticker: keyword
              });
            }
          }
        } catch (e) { continue; }
      }

      await saveCookies(context);
      await context.close();

      console.log(`    ✅ [FB] Extracted ${results.length} valid listings.`);
      return results;

    } catch (err: any) {
      if (context) await context.close();
      console.error("❌ FB Marketplace Error:", err.message);
      return null;
    }
  }
};
