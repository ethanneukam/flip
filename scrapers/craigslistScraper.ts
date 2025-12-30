import { Scraper } from "../scrapers/types";

const wait = (min = 500, max = 1500) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

export const craigslistScraper: Scraper = {
  source: "Craigslist",

  scrape: async (page: any, keyword: string) => {
    try {
      // 1. Navigate with randomized viewport/UA if possible via your manager
      await page.goto(
        `https://www.craigslist.org/search/sss?query=${encodeURIComponent(keyword)}`,
        { waitUntil: "networkidle" }
      );

      await wait(1000, 2000);

      // 2. Updated Selectors for the new Craigslist Layout
      // The new layout uses 'div.cl-static-search-result' or 'li.cl-search-result'
      const item = await page.$(".cl-search-result, .result-row"); 
      if (!item) return null;

      // 3. Extract Metadata
      const title = await item.$eval(".titlestring, .result-title", (el: any) => el.innerText).catch(() => "Unknown Asset");
      const url = await item.$eval("a", (el: any) => el.getAttribute("href")).catch(() => null);
      
      // Price on new CL is often inside 'span.priceinfo'
      const priceText = await item.$eval(".priceinfo, .result-price", (el: any) => el.innerText).catch(() => null);
      
      // Image extraction (CL uses lazy loading, so we grab the 1st gallery image)
      const imageUrl = await item.$eval("img", (el: any) => el.src).catch(() => null);

      if (!priceText || !url) return null;

      const price = parseFloat(priceText.replace(/[^0-9.]/g, ""));

      console.log(`✅ Craigslist: $${price} — ${title}`);

      return {
        price,
        url,
        condition: "Used", // Craigslist is almost exclusively used/secondary market
        title,
        image_url: imageUrl,
        ticker: keyword
      };
    } catch (err) {
      console.log("❌ Craigslist Scrape Error:", err);
      return null;
    }
  },
};
