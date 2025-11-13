import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Flip items to scrape
const itemsToScrape = [
  { item_id: 'ITEM_UUID_1', keyword: 'Nintendo Switch' },
  { item_id: 'ITEM_UUID_2', keyword: 'Apple AirPods' },
];

// --- Define site scrapers
interface Scraper {
  source: string;
  scrape: (page: any, keyword: string) => Promise<{ price: number; url: string; shipping?: number; condition?: string; seller_rating?: number } | null>;
}

// --- AMAZON ---
const amazonScraper: Scraper = {
  source: 'Amazon',
  scrape: async (page, keyword) => {
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.s-result-item');

    const product = await page.$('.s-result-item[data-asin]');
    if (!product) return null;

    const asin = await product.getAttribute('data-asin');
    const url = `https://www.amazon.com/dp/${asin}`;
    const priceWhole = await product.$eval('.a-price-whole', el => el.textContent?.replace(/[,]/g, '') || '0');
    const priceFraction = await product.$eval('.a-price-fraction', el => el.textContent || '0');
    const price = parseFloat(`${priceWhole}.${priceFraction}`);

    return { price, url, condition: 'New' };
  }
};

// --- WALMART ---
const walmartScraper: Scraper = {
  source: 'Walmart',
  scrape: async (page, keyword) => {
    const searchUrl = `https://www.walmart.com/search/?query=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    const product = await page.$('div.search-result-gridview-item');
    if (!product) return null;
    const url = await product.$eval('a', el => el.getAttribute('href') || '');
    const priceText = await product.$eval('[data-type="price"]', el => el.textContent?.replace(/[^0-9.]/g, '') || '0');
    const price = parseFloat(priceText);
    return { price, url: `https://www.walmart.com${url}` };
  }
};

// --- TARGET ---
const targetScraper: Scraper = {
  source: 'Target',
  scrape: async (page, keyword) => {
    const searchUrl = `https://www.target.com/s?searchTerm=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    const product = await page.$('li[data-test="list-entry-product-card"]');
    if (!product) return null;
    const url = await product.$eval('a', el => el.getAttribute('href') || '');
    const priceText = await product.$eval('span[data-test="current-price"]', el => el.textContent?.replace(/[^0-9.]/g, '') || '0');
    const price = parseFloat(priceText);
    return { price, url: `https://www.target.com${url}` };
  }
};

// --- GAMESTOP ---
const gamestopScraper: Scraper = {
  source: 'GameStop',
  scrape: async (page, keyword) => {
    const searchUrl = `https://www.gamestop.com/search/?q=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    const product = await page.$('div.product-tile');
    if (!product) return null;
    const url = await product.$eval('a', el => el.getAttribute('href') || '');
    const priceText = await product.$eval('.product-price', el => el.textContent?.replace(/[^0-9.]/g, '') || '0');
    const price = parseFloat(priceText);
    return { price, url: `https://www.gamestop.com${url}` };
  }
};

// --- WISH ---
const wishScraper: Scraper = {
  source: 'Wish',
  scrape: async (page, keyword) => {
    const searchUrl = `https://www.wish.com/search/${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    const product = await page.$('.ProductCard');
    if (!product) return null;
    const url = await product.$eval('a', el => el.getAttribute('href') || '');
    const priceText = await product.$eval('.price', el => el.textContent?.replace(/[^0-9.]/g, '') || '0');
    const price = parseFloat(priceText);
    return { price, url: `https://www.wish.com${url}` };
  }
};

// --- FACEBOOK MARKETPLACE (placeholder/fallback) ---
const fbMarketplaceScraper: Scraper = {
  source: 'Facebook Marketplace',
  scrape: async (_page, _keyword) => {
    // FB requires login, anti-bot, skipping for now
    return null;
  }
};

// --- TIKTOK SHOP (placeholder/fallback) ---
const tiktokScraper: Scraper = {
  source: 'TikTok Shop',
  scrape: async (_page, _keyword) => {
    // Needs login/API access, skipping for now
    return null;
  }
};

// --- EBAY ---
const ebayScraper: Scraper = {
  source: 'eBay',
  scrape: async (page, keyword) => {
    const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    const product = await page.$('.s-item');
    if (!product) return null;
    const url = await product.$eval('a.s-item__link', el => el.getAttribute('href') || '');
    const priceText = await product.$eval('.s-item__price', el => el.textContent?.replace(/[^0-9.]/g, '') || '0');
    const price = parseFloat(priceText);
    return { price, url };
  }
};

// --- OFFERUP ---
const offerupScraper: Scraper = {
  source: 'OfferUp',
  scrape: async (_page, _keyword) => null // Placeholder, dynamic content
};

// --- GRAILED ---
const grailedScraper: Scraper = {
  source: 'Grailed',
  scrape: async (page, keyword) => {
    const searchUrl = `https://www.grailed.com/shop?query=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    const product = await page.$('.feed-item');
    if (!product) return null;
    const url = await product.$eval('a', el => el.getAttribute('href') || '');
    const priceText = await product.$eval('.price', el => el.textContent?.replace(/[^0-9.]/g, '') || '0');
    const price = parseFloat(priceText);
    return { price, url: `https://www.grailed.com${url}` };
  }
};

// --- ALDI (placeholder/fallback) ---
const aldiScraper: Scraper = {
  source: 'Aldi',
  scrape: async (_page, _keyword) => null // Needs local store API, skipping for now
};

// --- All scrapers ---
const siteScrapers: Scraper[] = [
  amazonScraper,
  walmartScraper,
  targetScraper,
  gamestopScraper,
  wishScraper,
  fbMarketplaceScraper,
  tiktokScraper,
  ebayScraper,
  offerupScraper,
  grailedScraper,
  aldiScraper,
];

// --- Scraper runner ---
async function scrapeAll() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const item of itemsToScrape) {
    for (const scraper of siteScrapers) {
      try {
        const result = await scraper.scrape(page, item.keyword);
        if (result) {
          await supabase.from('external_prices').insert([
            {
              item_id: item.item_id,
              source: scraper.source,
              price: result.price,
              url: result.url,
              last_checked: new Date().toISOString(),
              shipping: result.shipping ?? null,
              condition: result.condition ?? null,
              seller_rating: result.seller_rating ?? null,
            },
          ]);
          console.log(`Saved ${scraper.source} price for ${item.keyword}: $${result.price}`);
        }
      } catch (err) {
        console.error(`Error scraping ${scraper.source}:`, err);
      }
    }
  }

  await browser.close();
}

scrapeAll();