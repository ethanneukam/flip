export async function convertToUSD(amount: number, fromCurrency: string): Promise<number> {
  if (fromCurrency === 'USD') return amount;
  
  try {
    // 2026 Free Real-time FX Endpoint
    const response = await fetch(`https://open.er-api.com/v6/latest/${fromCurrency}`);
    const data: any = await response.json();
    const rate = data.rates.USD;
    return amount * rate;
  } catch (error) {
    console.error("💱 FX Engine Error:", error);
    return amount; // Fallback to 1:1 to prevent scraper crash
  }
}
