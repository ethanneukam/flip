import fs from "fs";
import path from "path";
import { BrowserContext, Page, chromium } from "playwright";
import UserAgent from "user-agents";
import { ScraperResult } from "../scripts/scrapeRunner";

const COOKIE_DIR = path.resolve(process.cwd(), ".fb_cookies");
if (!fs.existsSync(COOKIE_DIR)) fs.mkdirSync(COOKIE_DIR);

const wait = (min = 300, max = 900) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

async function humanMoves(page: Page){
  for(let i=0;i<4;i++){
    await page.mouse.move(Math.random()*500+100, Math.random()*700+50, { steps: Math.floor(Math.random()*8)+5 });
    await wait(80,200);
  }
}

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
    console.log("[FB] Restored cookies for", profileId);
  }
  return context;
}

async function saveCookies(context: BrowserContext, profileId = "default"){
  try {
    const cookieFile = path.join(COOKIE_DIR, `${profileId}.json`);
    const cookies = await context.cookies();
    fs.writeFileSync(cookieFile, JSON.stringify(cookies, null, 2));
    console.log("[FB] Saved cookies for", profileId);
  } catch(e){ console.warn("[FB] Failed to save cookies", e); }
}

async function loginIfNeeded(context: BrowserContext, page: Page, email: string, pass: string) {
  await page.goto("https://m.facebook.com/marketplace", { waitUntil: "domcontentloaded", timeout: 30000 });
  if (await page.$("a[href*='login']")) {
    console.log("[FB] Not logged in, performing login...");
    await page.goto("https://m.facebook.com/login", { waitUntil: "domcontentloaded" });
    await page.fill("input[name='email']", email, { timeout: 10000 }).catch(()=>{});
    await page.fill("input[name='pass']", pass, { timeout: 10000 }).catch(()=>{});
    await page.click("button[name='login']");
    await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(()=>{});
    await wait(1500, 3000);
  } else {
    console.log("[FB] Already logged in.");
  }
}

export const facebookScraper = {
  source: "Facebook Marketplace",

  scrape: async (page: Page, keyword: string): Promise<ScraperResult | null> => {
    let context: BrowserContext | null = null;
    try {
      const FB_EMAIL = process.env.FB_EMAIL;
      const FB_PASSWORD = process.env.FB_PASSWORD;
      const PROXY = process.env.SCRAPE_PROXY;

      if (!FB_EMAIL || !FB_PASSWORD) {
        console.log("[FB] Missing FB_EMAIL/FB_PASSWORD; skipping.");
        return null;
      }

      const browser = (page as any).context()?.browser() || (await chromium.launch({ headless: true }));
      context = await createOrRestoreContext(browser, "default", PROXY);
      const fbPage = await context.newPage();

      await fbPage.setExtraHTTPHeaders({
        "user-agent": new UserAgent({ deviceCategory: "mobile" }).toString(),
        "accept-language":"en-US,en;q=0.9"
      });

      await loginIfNeeded(context, fbPage, FB_EMAIL, FB_PASSWORD);
      await wait(1000, 2500);

      const searchUrl = `https://m.facebook.com/marketplace/search/?query=${encodeURIComponent(keyword)}`;
      console.log("[FB] Searching:", searchUrl);
      await fbPage.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
      await wait(1200, 2800);

      const listingHandle = await fbPage.$("a[href*='/marketplace/item/'], div[role='article']");
      if (!listingHandle) {
        await context.close();
        return null;
      }

      // --- METADATA EXTRACTION ---
      const title = await listingHandle.$eval("span[style*='-webkit-line-clamp']", (el: any) => el.textContent).catch(() => keyword);
      const imageUrl = await listingHandle.$eval("img", (img: any) => img.src).catch(() => null);

      let priceText = await listingHandle.$eval("span", (el: any) => el.textContent).catch(()=>null);
      const link = await listingHandle.$eval("a[href*='/marketplace/item/']", (a:any)=>a.getAttribute("href")).catch(()=>null);
      const listingUrl = link ? (link.startsWith("http") ? link : `https://m.facebook.com${link}`) : searchUrl;

      const priceMatch = priceText?.replace(/,/g,'').match(/([0-9]+(?:\.[0-9]{1,2})?)/);
      const price = priceMatch ? parseFloat(priceMatch[1]) : null;

      await saveCookies(context);
      console.log(`[FB] Found ${price} — ${title}`);

      await context.close();

      return { 
        price: price || 0, 
        url: listingUrl, 
        condition: "Used",
        title: title || keyword,
        image_url: imageUrl,
        ticker: keyword
      };

    } catch (err) {
      if (context) await context.close();
      console.error("❌ FB Marketplace error:", err);
      return null;
    }
  }
};
