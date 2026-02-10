import { amazonScraper } from "./amazonScraper.js";
import { ebayScraper } from "./ebayScraper.js";
import { bestbuyScraper } from "./bestbuyScraper.js";
import { craigslistScraper } from "./craigslistScraper.js";
import { etsyScraper } from "./etsyScraper.js";
import { facebookScraper } from "./facebookScraper.js";
import { offerupScraper } from "./offerupScraper.js";
import { stockxScraper } from "./stockxScraper.js";
import { targetScraper } from "./targetScraper.js";
import { walmartScraper } from "./walmartScraper.js";
export * from "./types.js";

export const allScrapers = [
  amazonScraper,
  ebayScraper,
  bestbuyScraper,
  craigslistScraper,
  etsyScraper,
  facebookScraper,
  offerupScraper,
  stockxScraper,
  targetScraper,
  walmartScraper
];
