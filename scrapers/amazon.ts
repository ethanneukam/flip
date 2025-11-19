import { Scraper } from "../scripts/scrapeRunner";

export const amazonScraper: Scraper = {
  source: "Amazon",

  run: async (page, keyword) => {
    const url = `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`;

    await page.goto(url, { waitUntil: "domcontentloaded" });

    await page.waitForSelector(".s-result-item[data-asin]", {
      timeout: 5000,
    });

    const product = await page.$(".s-result-item[data-asin]");
    if (!product) return null;

    const asin = await product.getAttribute("data-asin");
    const productUrl = `https://www.amazon.com/dp/${asin}`;

    const priceWhole = await product.$eval(
      ".a-price-whole",
      (el: any) => el.textContent?.replace(/,/g, "") || "0"
    );

    const priceFraction = await product.$eval(
      ".a-price-fraction",
      (el: any) => el.textContent || "0"
    );

    const price = parseFloat(`${priceWhole}.${priceFraction}`);

    return {
      price,
      url: productUrl,
      condition: "New",
    };
  },
};