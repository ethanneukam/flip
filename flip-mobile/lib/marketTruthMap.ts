/**
 * SINGLE SOURCE FIELD NORMALIZATION LAYER (Phase 10.2.1)
 * Maps persisted `market_signals` / API shape → Glasscard contract.
 * Do not duplicate these aliases in screens or Glasscard components.
 */
import type { ConfidenceReason, GlasscardMarketData } from '../types/models';

/** Canonical DB column names for UI contract (alias layer only — no pricing math). */
export const MarketTruthMap = {
  fair_market_value: 'avg_price',
  confidence_tier: 'confidence_reason',
} as const;

export type ExternalCompRow = {
  source: string;
  price: number | null;
  url: string | null;
};

/** Option A: no schema change — comps stubbed from `data_sources` until URLs/prices exist per row. */
export function externalCompsFromDataSources(
  dataSources: string[] | null | undefined
): ExternalCompRow[] | null {
  const list = dataSources ?? [];
  if (list.length === 0) return null;
  return list.map((source) => ({ source, price: null, url: null }));
}

/** Build `GlasscardMarketData` strictly from a `market_signals` row (read boundary). */
export function glasscardMarketFromSignalRow(row: {
  avg_price: number;
  low_price: number;
  high_price: number;
  recommended_price: number;
  demand_score: number;
  supply_score?: number;
  confidence_reason: string | null;
  data_sources?: string[] | null;
  computed_at?: string | null;
}): GlasscardMarketData {
  return {
    avg_price: Number(row.avg_price),
    low_price: Number(row.low_price),
    high_price: Number(row.high_price),
    recommended_price: Number(row.recommended_price),
    demand_score: Number(row.demand_score),
    liquidity_score: null,
    volatility_score: null,
    confidence_reason: (row.confidence_reason as ConfidenceReason) ?? null,
    external_comps: externalCompsFromDataSources(row.data_sources ?? null),
    updated_at: row.computed_at ?? null,
  };
}
