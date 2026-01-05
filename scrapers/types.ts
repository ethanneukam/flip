export interface Scraper {
  source: string;
  scrape: (
    page: any,
    keyword: string
  ) => Promise<{
    price: number;
    url: string;
    condition?: string;
    current_value?: number;
    shipping?: number | null;
    seller_rating?: number | null;
  } | null>;
}
