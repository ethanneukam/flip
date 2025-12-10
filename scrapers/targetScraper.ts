import UserAgent from "user-agents";

const wait = (min = 300, max = 900) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

export const targetScraper = {
  source: "Target",

  scrape: async (page: any, keyword: string) => {
    try {
      await page.setExtraHTTPHeaders({
        "user-agent": new UserAgent().toString(),
        "accept-language": "en-US,en;q=0.9",
      });

      const searchUrl = `https://www.target.com/s?searchTerm=${encodeURIComponent(keyword)}`;
      console.log("🔍 Navigating:", searchUrl);

      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 50000,
      });

      await wait(1000, 1500);

      const product = await page.$("a[data-test='product-title']");
      if (!product) {
        console.log("⚠️ No Target product found.");
        return null;
      }

      const url = await product.evaluate(
        el => "https://www.target.com" + el.getAttribute("href")
      );

      const priceEl = await page.$("[data-test='current-price']");
      if (!priceEl) {
        console.log("⚠️ Target price not found.");
        return null;
      }

      const priceText = await priceEl.evaluate(el =>
        el.textContent?.replace(/[^0-9.]/g, "")
      );

      const price = parseFloat(priceText || "0");

      console.log(`✅ Target: $${price} — ${url}`);

      return {
        price,
        url,
        condition: "New",
      };
    } catch (err) {
      console.log("❌ Target Scrape Error:", err);
      return null;
    }
  },
};
