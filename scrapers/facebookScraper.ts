// scrapers/fbMarketplaceScraper.ts
import fs from "fs";
import path from "path";
import { BrowserContext, Page } from "playwright";
import UserAgent from "user-agents";
import { chromium } from "playwright";

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
  // create context with mobile UA / viewport
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
  // quick check if logged in
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
  run: async (page: Page, keyword: string) => {
    try {
      // read creds and optional proxy from env
      const FB_EMAIL = process.env.FB_EMAIL;
      const FB_PASSWORD = process.env.FB_PASSWORD;
      const PROXY = process.env.SCRAPE_PROXY; // optional "http://user:pass@host:port"

      if (!FB_EMAIL || !FB_PASSWORD) {
        console.log("[FB] Missing FB_EMAIL/FB_PASSWORD in env; skipping Facebook Marketplace.");
        return null;
      }

      // We'll create a context per run using the browser that's passed in by your runner.
      // BUT runner typically shares one context/page; for FB create a fresh context for isolation:
      // NOTE: If your runner passes a shared page, create new context here:
      const browser = (page as any)._browser || (await chromium.launch({ headless: true }));
      const context = await createOrRestoreContext(browser, "default", PROXY);
      const fbPage = await context.newPage();

      // set mobile UA
      await fbPage.setExtraHTTPHeaders({ "user-agent": new UserAgent({ deviceCategory: "mobile" }).toString(), "accept-language":"en-US,en;q=0.9" });

      // Login if necessary
      await loginIfNeeded(context, fbPage, FB_EMAIL, FB_PASSWORD);
      await wait(1000, 2500);
      await humanMoves(fbPage);

      // Search mobile Marketplace
      const searchUrl = `https://m.facebook.com/marketplace/search/?query=${encodeURIComponent(keyword)}`;
      console.log("[FB] Searching:", searchUrl);
      await fbPage.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
      await wait(1200, 2800);
      await humanMoves(fbPage);

      // Wait for listing cards
      await fbPage.waitForSelector("a[href*='/marketplace/item/'], div[role='article']", { timeout: 15000 }).catch(()=>{});
      // pick first listing link
      const listingHandle = await fbPage.$("a[href*='/marketplace/item/'], div[role='article']");
      if (!listingHandle) {
        console.log("[FB] No marketplace listing found");
        await saveCookies(context);
        await context.close();
        return null;
      }

      // attempt to extract price and url
      let priceText = null;
      try {
        priceText = await listingHandle.$eval("span", (el: any) => el.textContent).catch(()=>null);
      } catch(e){}

      // fallback: try to click and open detail page
      let listingUrl = null;
      try {
        const link = await listingHandle.$eval("a[href*='/marketplace/item/']", (a:any)=>a.getAttribute("href")).catch(()=>null);
        if (link) {
          listingUrl = link.startsWith("http") ? link : `https://m.facebook.com${link}`;
          await fbPage.goto(listingUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
          await wait(900, 1600);
          // try extracting price from detail
          priceText = priceText || await fbPage.$eval("[aria-label='Price'] , span[dir='ltr'], div[role='article'] span", (el:any)=>el.textContent).catch(()=>null);
        }
      } catch(e){}

      // parse price
      if (!priceText) {
        console.log("[FB] Could not find price text");
        await saveCookies(context);
        await context.close();
        return null;
      }
      const priceMatch = priceText.replace(/,/g,'').match(/([0-9]+(?:\.[0-9]{1,2})?)/);
      const price = priceMatch ? parseFloat(priceMatch[1]) : null;
      if (!price) {
        console.log("[FB] Price parse failed");
        await saveCookies(context);
        await context.close();
        return null;
      }

      // save cookies for reuse
      await saveCookies(context);

      console.log(`[FB] Found ${price} @ ${listingUrl}`);
      await context.close();
      return { price, url: listingUrl || searchUrl, condition: "Used (FB Listing)" };
    } catch (err) {
      console.error("❌ FB Marketplace error:", err);
      return null;
    }
  }
};
