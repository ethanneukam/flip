import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// --- Supabase Setup ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Test Item ---
const testItem = {
  item_id: 'INSERT_FLIP_ITEM_ID_HERE', // replace with an actual Flip item UUID
  query: 'Nintendo Switch', // search keyword or ASIN
};

async function scrapeAmazon() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(testItem.query)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

    // Wait for product listings
    await page.waitForSelector('.s-result-item');

    // Grab the first product
    const product = await page.$('.s-result-item[data-asin]');

    if (!product) throw new Error('No products found');

    const asin = await product.getAttribute('data-asin');
    const url = `https://www.amazon.com/dp/${asin}`;

    // Price can be tricky, check multiple selectors
    const priceWhole = await product.$eval('.a-price-whole', el => el.textContent?.replace(/[,]/g, '') || '0');
    const priceFraction = await product.$eval('.a-price-fraction', el => el.textContent || '0');
    const price = parseFloat(`${priceWhole}.${priceFraction}`);

    console.log({ asin, url, price });

    // --- Store in Supabase ---
    const { data, error } = await supabase.from('external_prices').insert([
      {
        item_id: testItem.item_id,
        source: 'Amazon',
        price,
        url,
        last_checked: new Date().toISOString(),
        shipping: null,
        condition: 'New',
        seller_rating: null,
      },
    ]);

    if (error) console.error('Supabase insert error:', error);
    else console.log('Price saved:', data);

  } catch (err) {
    console.error('Scrape error:', err);
  } finally {
    await browser.close();
  }
}

// Run scraper
scrapeAmazon();