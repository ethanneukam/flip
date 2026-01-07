import { amazonScraper } from "./amazonScraper";
import { ebayScraper } from "./ebayScraper";
import { bestbuyScraper } from "./bestbuyScraper";
import { craigslistScraper } from "./craigslistScraper";
import { etsyScraper } from "./etsyScraper";
import { facebookScraper } from "./facebookScraper";
import { offerupScraper } from "./offerupScraper";
import { stockxScraper } from "./stockxScraper";
import { targetScraper } from "./targetScraper";
import { walmartScraper } from "./walmartScraper";
export * from "./types";

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
