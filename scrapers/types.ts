import { Page } from "playwright";

export interface ScraperResult {
  price: number;
  url: string;
  condition?: string;
  title?: string;
  image_url?: string | null;
  ticker?: string;
  shipping?: number | null;
  seller_rating?: number | null;
}

export interface Scraper {
  source: string;
  scrape: (page: any, keyword: string, tld?: string) => Promise<ScraperResult[] | null>;
}
