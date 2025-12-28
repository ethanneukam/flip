// lib/vault-service.ts
import { supabase } from './supabaseClient'; // Assumes existing client
import { VaultAsset, OracleMetric } from '../types/core';

export const VaultService = {
  /**
   * Fetch user's private vault.
   * Joins 'items' with 'oracle_prices' on SKU.
   */
  async getMyVault(userId: string): Promise<{ assets: VaultAsset[], oracleData: Record<string, OracleMetric> }> {
    
    // 1. Fetch raw items
    const { data: items, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active'); // Ignore deleted/archived

    if (error) throw error;

    if (!items || items.length === 0) {
      return { assets: [], oracleData: {} };
    }

    // 2. Extract SKUs to fetch Oracle Data
    const skus = items.map(i => i.sku).filter(Boolean);
    
    // 3. Fetch latest Oracle prices for these SKUs
    const { data: prices } = await supabase
      .from('oracle_prices')
      .select('*')
      .in('sku', skus);

    // 4. Map Oracle data for O(1) lookup
    const oracleMap: Record<string, OracleMetric> = {};
    prices?.forEach(p => {
      oracleMap[p.sku] = {
        sku: p.sku,
        name: p.name,
        current_price: p.current_price,
        currency: p.currency,
        day_change_percentage: p.day_change_percentage,
        confidence_score: p.confidence_score,
        last_updated: p.last_updated,
        source_count: p.source_count
      };
    });

    // 5. Transform database rows to VaultAsset type
    const assets: VaultAsset[] = items.map(item => ({
      id: item.id,
      user_id: item.user_id,
      title: item.title,
      sku: item.sku,
      brand: item.brand,
      model: item.model,
      condition_score: item.condition_score || 80, // Default to 8/10 if missing
      acquired_at: item.created_at,
      image_url: item.image_url,
      is_public: false, // Force private for Vault
      notes: item.description
    }));

    return { assets, oracleData: oracleMap };
  }
};