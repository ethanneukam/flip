import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Items to scrape
const itemsToScrape = [
  { item_id: 'ITEM_UUID_1', keyword: 'Nintendo Switch' },
  { item_id: 'ITEM_UUID_2', keyword: 'Apple AirPods' },
];

// --- Scraper Interface
interface Scraper {
  source: string;
  scrape: (page: any, keyword: string) => Promise<{
    price: number;
    url: string;
    shipping?: number | null;
    condition?: string | null;
    seller_rating?: number | null;
  } | null>;
}

/* ---------------------------------------------------
   AMAZON
---------------------------------------------------- */
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

    const priceWhole = await product.$eval('.a-price-whole', el => el.textContent?.replace(/[,]/g, '') || '0').catch(() => '0');
    const priceFraction = await product.$eval('.a-price-fraction', el => el.textContent || '0').catch(() => '0');

    const price = parseFloat(`${priceWhole}.${priceFraction}`);

    return { price, url, condition: 'New' };
  }
};


/* ---------------------------------------------------
   WALMART
---------------------------------------------------- */
const walmartScraper: Scraper = {
  source: 'Walmart',
  scrape: async (page, keyword) => {
    const url = `https://www.walmart.com/search/?query=${encodeURIComponent(keyword)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const product = await page.$('div.search-result-gridview-item');
    if (!product) return null;

    const rel = await product.$eval('a', el => el.getAttribute('href')).catch(() => null);
    const link = rel ? `https://www.walmart.com${rel}` : url;

    const priceText = await product.$eval('[data-type="price"]', el =>
      el.textContent?.replace(/[^0-9.]/g, '') || '0'
    ).catch(() => '0');

    return { price: parseFloat(priceText), url: link, condition: 'New' };
  }
};


/* ---------------------------------------------------
   TARGET
---------------------------------------------------- */
const targetScraper: Scraper = {
  source: 'Target',
  scrape: async (page, keyword) => {
    const searchUrl = `https://www.target.com/s?searchTerm=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

    const product = await page.$('a[data-test="product-title"]');
    if (!product) return null;

    const rel = await product.getAttribute('href').catch(() => null);
    const url = rel ? `https://www.target.com${rel}` : searchUrl;

    const priceText = await page.$eval(
      '[data-test="current-price"]',
      el => el.textContent?.replace(/[^0-9.]/g, '') || '0'
    ).catch(() => '0');

    return { price: parseFloat(priceText), url, condition: 'New' };
  }
};


/* ---------------------------------------------------
   GAMESTOP
---------------------------------------------------- */
const gamestopScraper: Scraper = {
  source: 'GameStop',
  scrape: async (page, keyword) => {
    const url = `https://www.gamestop.com/search/?q=${encodeURIComponent(keyword)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const product = await page.$('div.product-tile');
    if (!product) return null;

    const rel = await product.$eval('a', el => el.getAttribute('href')).catch(() => null);
    const link = rel ? `https://www.gamestop.com${rel}` : url;

    const priceText = await product.$eval('.product-price', el =>
      el.textContent?.replace(/[^0-9.]/g, '') || '0'
    ).catch(() => '0');

    return { price: parseFloat(priceText), url: link, condition: 'New' };
  }
};


/* ---------------------------------------------------
   WISH
---------------------------------------------------- */
const wishScraper: Scraper = {
  source: 'Wish',
  scrape: async (page, keyword) => {
    const url = `https://www.wish.com/search/${encodeURIComponent(keyword)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const product = await page.$('.ProductCard');
    if (!product) return null;

    const rel = await product.$eval('a', el => el.getAttribute('href')).catch(() => null);
    const link = rel ? `https://www.wish.com${rel}` : url;

    const priceText = await product.$eval('.price', el =>
      el.textContent?.replace(/[^0-9.]/g, '') || '0'
    ).catch(() => '0');

    return { price: parseFloat(priceText), url: link, condition: 'New' };
  }
};


/* ---------------------------------------------------
   FACEBOOK — disabled
---------------------------------------------------- */
const fbMarketplaceScraper: Scraper = {
  source: 'Facebook Marketplace',
  scrape: async () => null
};


/* ---------------------------------------------------
   TIKTOK — disabled
---------------------------------------------------- */
const tiktokScraper: Scraper = {
  source: 'TikTok Shop',
  scrape: async () => null
};


/* ---------------------------------------------------
   EBAY
---------------------------------------------------- */
const ebayScraper: Scraper = {
  source: 'eBay',
  scrape: async (page, keyword) => {
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keyword)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const product = await page.$('.s-item');
    if (!product) return null;

    const link = await product.$eval('a.s-item__link', el => el.getAttribute('href')).catch(() => null);
    const priceText = await product.$eval('.s-item__price', el =>
      el.textContent?.replace(/[^0-9.]/g, '') || '0'
    ).catch(() => '0');

    return { price: parseFloat(priceText), url: link || url, condition: 'Used' };
  }
};


/* ---------------------------------------------------
   OFFERUP — replaced with working version
---------------------------------------------------- */
const offerupScraper: Scraper = {
  source: "OfferUp",
  scrape: async (page, keyword) => {
    await page.goto(`https://offerup.com/search/?q=${encodeURIComponent(keyword)}`, {
      waitUntil: "domcontentloaded"
    });

    const item = await page.$("a[href*='/item/']");
    if (!item) return null;

    const rel = await item.getAttribute("href");
    if (!rel) return null;

    const fullUrl = rel.startsWith("http") ? rel : `https://offerup.com${rel}`;

    await page.goto(fullUrl, { waitUntil: "domcontentloaded" });

    const priceText = await page.$eval("span[class*='Price']", el =>
      el.textContent?.replace(/[^0-9.]/g, "") || "0"
    ).catch(() => "0");

    return { price: parseFloat(priceText), url: fullUrl, condition: "Used" };
  }
};


/* ---------------------------------------------------
   GRAILED
---------------------------------------------------- */
const grailedScraper: Scraper = {
  source: 'Grailed',
  scrape: async (page, keyword) => {
    const url = `https://www.grailed.com/shop?query=${encodeURIComponent(keyword)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const product = await page.$('.feed-item');
    if (!product) return null;

    const rel = await product.$eval('a', el => el.getAttribute('href')).catch(() => null);
    const link = rel ? `https://www.grailed.com${rel}` : url;

    const priceText = await product.$eval('.price', el =>
      el.textContent?.replace(/[^0-9.]/g, '') || '0'
    ).catch(() => '0');

    return { price: parseFloat(priceText), url: link, condition: 'Used' };
  }
};


/* ---------------------------------------------------
   ALDI — disabled
---------------------------------------------------- */
const aldiScraper: Scraper = {
  source: 'Aldi',
  scrape: async () => null
};


/* ---------------------------------------------------
   EXPORT SCRAPERS
---------------------------------------------------- */
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

/* ---------------------------------------------------
   SCRAPE ALL
---------------------------------------------------- */
export async function scrapeAll({ updateExisting = true } = {}) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const item of itemsToScrape) {
    for (const scraper of siteScrapers) {
      try {
        const result = await scraper.scrape(page, item.keyword);
        if (!result) continue;

        const { data: existing } = await supabase
          .from('external_prices')
          .select('id')
          .eq('item_id', item.item_id)
          .eq('source', scraper.source)
          .single();

        if (existing && updateExisting) {
          await supabase
            .from('external_prices')
            .update({
              price: result.price,
              url: result.url,
              last_checked: new Date().toISOString(),
              shipping: result.shipping ?? null,
              condition: result.condition ?? null,
              seller_rating: result.seller_rating ?? null,
            })
            .eq('id', existing.id);

          console.log(`Updated ${scraper.source} price: $${result.price}`);
        } else if (!existing) {
          await supabase.from('external_prices').insert([{
            item_id: item.item_id,
            source: scraper.source,
            price: result.price,
            url: result.url,
            last_checked: new Date().toISOString(),
            shipping: result.shipping ?? null,
            condition: result.condition ?? null,
            seller_rating: result.seller_rating ?? null,
          }]);

          console.log(`Saved new ${scraper.source} price: $${result.price}`);
        }
      } catch (err) {
        console.error(`Error scraping ${scraper.source}:`, err);
      }
    }
  }

  await browser.close();
}

scrapeAll();
