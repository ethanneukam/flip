import UserAgent from "user-agents";

const wait = (min = 300, max = 900) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

async function humanScroll(page) {
  for (let i = 0; i < 2; i++) {
    await page.mouse.wheel(0, Math.random() * 600 + 200);
    await wait(300, 800);
  }
}

export const walmartScraper = {
  source: "Walmart",

  run: async (page, keyword) => {
    try {
      await page.setExtraHTTPHeaders({
        "user-agent": new UserAgent().toString(),
        "accept-language": "en-US,en;q=0.9",
      });

      const searchUrl = `https://www.walmart.com/search?q=${encodeURIComponent(keyword)}`;
      console.log("🔍 Navigating:", searchUrl);

      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 50000,
      });

      await wait(1000, 1500);
      await humanScroll(page);

      // Walmart uses div[data-item-id]
      const product = await page.$("[data-item-id]");

      if (!product) {
        console.log("⚠️ No Walmart product found.");
        return null;
      }

      // Pull URL
      const url = await product.$eval("a", el => "https://www.walmart.com" + el.getAttribute("href"));
      
      // Price selector attempts
      const selectors = [
        "[data-automation='product-price'] span",
        ".mr2.lh-copy.f6 span",
        ".w_iUH7",
      ];

      let priceText = null;
      for (const s of selectors) {
        try {
          priceText = await product.$eval(s, el =>
            el.textContent?.replace(/[^0-9.]/g, "")
          );
          if (priceText) break;
        } catch {}
      }

      if (!priceText) {
        console.log("⚠️ Walmart price not found.");
        return null;
      }

      const price = parseFloat(priceText);

      console.log(`✅ Walmart: $${price} — ${url}`);

      return {
        price,
        url,
        condition: "New",
      };
    } catch (err) {
      console.log("❌ Walmart Scrape Error:", err);
      return null;
    }
  },
};