// lib/oracle.ts

export const MOCK_INDICES = [
  { id: 'idx_lux', name: 'Luxury 50', value: 24102.00, change: 1.4, color: 'bg-black' },
  { id: 'idx_ele', name: 'Electronics', value: 1450.00, change: -3.2, color: 'bg-blue-600' },
  { id: 'idx_snk', name: 'Sneakers', value: 840.00, change: 0.8, color: 'bg-green-600' },
];

export const OracleService = {
  getIndices: async () => {
    // This will eventually fetch from your Supabase 'market_indices' table
    return MOCK_INDICES;
  },
  
  getTopMovers: async () => {
    // This will eventually fetch from your Supabase 'oracle_prices' table
    return [
      {
        sku: 'AJ1-85-RED',
        name: 'Jordan 1 Retro High',
        current_price: 1200,
        day_change_percentage: 8.4,
        confidence_score: 95,
      }
    ];
  }
};
