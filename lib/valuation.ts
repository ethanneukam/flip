// lib/valuation.ts
import { VaultAsset, OracleMetric } from '../types/core';

interface PortfolioSummary {
  totalValue: number;
  dayChangeAbs: number;
  dayChangePct: number;
  assetCount: number;
  topMover?: VaultAsset; // The item that changed the most
}

export const calculatePortfolio = (
  assets: VaultAsset[], 
  oracleData: Record<string, OracleMetric>
): PortfolioSummary => {
  
  let totalValue = 0;
  let previousDayValue = 0;
  let assetCount = 0;
  
  assets.forEach(asset => {
    // If no SKU or no Oracle data, we cannot value it (or use manual price if exists - ignored for now)
    if (!asset.sku || !oracleData[asset.sku]) return;

    const metric = oracleData[asset.sku];
    const currentPrice = metric.current_price;
    
    // Calculate yesterday's price derived from % change
    // Formula: prev = current / (1 + (pct / 100))
    const prevPrice = currentPrice / (1 + (metric.day_change_percentage / 100));

    totalValue += currentPrice;
    previousDayValue += prevPrice;
    assetCount++;
  });

  const dayChangeAbs = totalValue - previousDayValue;
  const dayChangePct = previousDayValue > 0 ? (dayChangeAbs / previousDayValue) * 100 : 0;

  return {
    totalValue,
    dayChangeAbs,
    dayChangePct,
    assetCount
  };
};