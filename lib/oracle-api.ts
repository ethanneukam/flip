// lib/oracle-api.ts
import { supabase } from './supabaseClient';
import { OracleMetric } from '../types/core';

/**
 * Fetches the global market "Truth" for a specific SKU.
 * Decoupled from user inventory.
 */
export async function getOracleDataBySKU(sku: string): Promise<OracleMetric | null> {
  const { data, error } = await supabase
    .from('oracle_prices')
    .select('*')
    .eq('sku', sku)
    .single();

  if (error || !data) {
    console.error('Oracle Lookup Failed:', error);
    return null;
  }

  return {
    sku: data.sku,
    name: data.asset_name,
    current_price: data.price,
    currency: 'USD',
    day_change_percentage: data.change_24h,
    confidence_score: data.confidence_index,
    last_updated: data.last_scrape_timestamp,
    source_count: data.sources_aggregated?.length || 0
  };
}
