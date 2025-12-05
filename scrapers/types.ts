export interface Scraper {
  source: string;
  scrape: (page: any, keyword: string) => Promise<{
    price: number;
    url: string;
    condition: string;
  } | null>;
}
