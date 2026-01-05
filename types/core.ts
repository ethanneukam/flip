// types/core.ts

/**
 * PILLAR 1: VAULT
 * Represents an item in a user's private collection.
 * Private by default. Not a listing.
 */
export interface VaultAsset {
  id: string; // UUID
  user_id: string;
  
  // Core Identity
  title: string;
  sku?: string; // Critical for Oracle matching
  brand?: string;
  model?: string;
  
  // Asset State
  condition_score: number; // 1-100 scale (CV derived)
  purchase_price?: number;
  acquired_at: string; // ISO Date
  
  // Oracle Link
  oracle_id?: string; // Link to global pricing truth
  
  // Metadata
  image_url: string;
  current_value?: number;
  notes?: string;
  is_public: boolean; // Default false
}

/**
 * PILLAR 2: ORACLE
 * Represents the global "Truth" about an asset's value.
 * Aggregated from scrapers and historical data.
 */
export interface OracleMetric {
  sku: string;
  name: string;
  
  // Pricing
  current_price: number;
  currency: 'USD';
  day_change_percentage: number; // Volatility metric
  confidence_score: number; // 0-100 (How much do we trust this price?)
  
  // Market Data
  last_updated: string;
  source_count: number; // How many external signals
}

/**
 * PILLAR 3: PULSE
 * Social intelligence. 
 * Posts are updates on assets, not sales pitches.
 */
export interface PulsePost {
  id: string;
  user_id: string;
  asset_id?: string; // Optional link to a Vault Asset
  
  content: string;
  image_url?: string;
  
  // Engagement (No transactional signals)
  created_at: string;
  likes_count: number;
  
  // The Oracle Embed
  embedded_chart_data?: OracleMetric;
}
