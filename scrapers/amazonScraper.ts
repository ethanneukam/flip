import { chromium } from "playwright";
import UserAgent from "user-agents";

// Random delay (human reaction / thinking)
const wait = (min = 120, max = 450) =>
  new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

// Full human typing
async function humanType(page, selector, text) {
  await page.click(selector, { delay: 100 });
  let current = "";
  for (const char of text) {
    const typoChance = Math.random();
    if (typoChance < 0.08) {
      // add typo
      const typo = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      await page.type(selector, typo, { delay: Math.random() * 150 + 30 });
      await wait(80, 160);
      await page.keyboard.press("Backspace");
    }

    await page.type(selector, char, { delay: Math.random() * 120 + 20 });
    current += char;
    await wait(50, 180);
  }
}

// Human random mouse movements
async function humanMouse(page) {
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * 900 + 100;
    const y = Math.random() * 800 + 100;
    await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 20) + 10 });
    await wait(60, 200);
  }
}

// Fake human tab-switch
async function humanTabSwitch(page) {
  if (Math.random() < 0.35) {
    await page.keyboard.down("Control");
    await page.keyboard.press("PageDown");
    await page.keyboard.up("Control");
    await wait(300, 700);
  }
}

// Slow scroll exploration
async function humanScroll(page) {
  const scrolls = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < scrolls; i++) {
    const distance = Math.random() * 650 + 200;
    await page.mouse.wheel(0, distance);
    await wait(400, 900);
  }
}

// Add fingerprint spoofing polyfills
async function applyFingerprintSpoofing(page) {
  await page.addInitScript(() => {
    // WebGL spoof
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (param) {
      if (param === 37445) return "NVIDIA Corporation";
      if (param === 37446) return "NVIDIA GeForce GTX 1080/PCIe/SSE2";
      return getParameter.apply(this, [param]);
    };

    // Fix plugins
    Object.defineProperty(navigator, "plugins", {
      get: () => [{ name: "Chrome PDF Plugin" }],
    });

    // Fake media devices
    Object.defineProperty(navigator, "mediaDevices", {
      get: () => ({
        enumerateDevices: () =>
          Promise.resolve([
            { kind: "audioinput", label: "Microphone", deviceId: "abc" },
            { kind: "videoinput", label: "Webcam", deviceId: "def" },
          ]),
      }),
    });

    // Fake battery
  (navigator as any).getBattery = () =>
      Promise.resolve({
        level: 0.77,
        charging: false,
        chargingTime: Infinity,
        dischargingTime: 5400,
      });
  });
}

export const amazonScraper = {
  source: "Amazon",
  run: async (page, keyword) => {
    try {
      // Random real user agent
      const ua = new UserAgent().toString();

      await page.setExtraHTTPHeaders({
        "user-agent": ua,
        "accept-language": "en-US,en;q=0.9",
      });

      await applyFingerprintSpoofing(page);

      // Navigate to Amazon homepage
      await page.goto("https://www.amazon.com", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await wait(1000, 1800);
      await humanMouse(page);

      // Human typing search
      await humanType(page, "#twotabsearchtextbox", keyword);
      await wait(300, 600);
      await page.keyboard.press("Enter");

      await page.waitForSelector(".s-main-slot", {
        timeout: 15000,
      });

      await wait(1200, 2000);
      await humanScroll(page);
      await humanMouse(page);
      await humanTabSwitch(page);

      // Check for CAPTCHA
      const captcha = await page.$("form[action='/errors/validateCaptcha']");
      if (captcha) {
        console.log("⚠️ CAPTCHA detected — skipping.");
        return null;
      }

      // Find clean ASIN product
      const product = await page.$(
        '.s-result-item[data-asin]:not([data-asin=""]):not([data-asin="0"])'
      );
      if (!product) {
        console.log("⚠️ No product found.");
        return null;
      }

      const asin = await product.getAttribute("data-asin");
      const url = `https://www.amazon.com/dp/${asin}`;

      const priceSelectors = [
        ".a-price .a-offscreen",
        ".a-price-whole",
        "[data-a-color='price'] .a-offscreen",
      ];

      let price = null;

      for (const sel of priceSelectors) {
        try {
          const raw = await product.$eval(sel, el =>
            el.textContent?.replace(/[^0-9.]/g, "")
          );
          if (raw) price = parseFloat(raw);
          if (!isNaN(price)) break;
        } catch {}
      }

      if (!price) {
        console.log("⚠️ Price not found.");
        return null;
      }

      await humanMouse(page);
      await humanScroll(page);

      console.log(`✅ Amazon: $${price} — ${url}`);

      return {
        price,
        url,
        condition: "New",
      };
    } catch (err) {
      console.log("❌ Amazon Scrape Error:", err);
      return null;
    }
  },
};
