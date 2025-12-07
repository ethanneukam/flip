import { amazonScraper } from "./amazonScraper";
import { ebayScraper } from "./ebayScraper";
import { facebookScraper } from "./facebookScraper";
import { walmartScraper } from "./walmartScraper";
import { targetScraper } from "./targetScraper";
import { bestbuyScraper } from "./bestbuyScraper";

export * from "./types";

export const allScrapers = [
  amazonScraper,
  ebayScraper,
  fbMarketplaceScraper,
  walmartScraper,
  targetScraper,
  bestbuyScraper,
];
