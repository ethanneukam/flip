import { amazonScraper } from "./amazonScraper";
import { ebayScraper } from "./ebayScraper";
import { fbMarketplaceScraper } from "./fbMarketplaceScraper";
import { walmartScraper } from "./walmartScraper";
import { targetScraper } from "./targetScraper";
import { bestbuyScraper } from "./bestbuyScraper";

export interface Scraper {
  name: string;
  run: (item: { id: number; search_keyword: string }) => Promise<any>;
}

export const allScrapers = [
  amazonScraper,
  ebayScraper,
  fbMarketplaceScraper,
  walmartScraper,
  targetScraper,
  bestbuyScraper,
];

export type { Scraper };
