// components/asset/AssetActionPanel.tsx
import React from 'react';
import { ShieldCheck, Database, ExternalLink } from 'lucide-react';
import FeatureGuard from '../common/FeatureGuard';
import { VaultAsset, OracleMetric } from '../../types/core';

interface AssetActionPanelProps {
  asset: VaultAsset;
  oracleData?: OracleMetric;
}

export default function AssetActionPanel({ asset, oracleData }: AssetActionPanelProps) {
  
  // Pivot Logic: "Seller" is now just a data point called "Source"
  // If the user_id exists, we display it as the provenance source, not a merchant.

  return (
    <div className="p-4 bg-white border-t border-gray-100 pb-safe">
      
      {/* 1. Source Provenance (Replacing "Seller Info") */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 text-xs text-gray-500 uppercase tracking-wide">
          <Database size={14} />
          <span>Source Provenance</span>
        </div>
        <div className="text-sm font-medium text-black">
          {/* We anonymize or treat the uploader as a data node */}
          ID: {asset.user_id.slice(0, 8)}...
        </div>
      </div>

      {/* 2. Oracle Data Snapshot (Replacing Price Tag) */}
      <div className="mb-6">
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold tracking-tight">
            ${oracleData?.current_price?.toLocaleString() || '---'}
          </span>
          {oracleData && (
            <span className={`text-sm font-medium ${oracleData.day_change_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {oracleData.day_change_percentage > 0 ? '+' : ''}{oracleData.day_change_percentage}% (24h)
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Global Average Price • {oracleData?.confidence_score ?? 0}% Confidence
        </div>
      </div>

      {/* 3. The Actions (Replacing "Buy Now" and "Add to Cart") */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* LEFT BUTTON: Legacy Buy (Inert/Disabled) */}
        <FeatureGuard feature="enableMarketplace" mode="inert">
          <button className="w-full py-3 bg-gray-100 text-gray-400 rounded-lg font-medium text-sm">
            Buy Now
          </button>
        </FeatureGuard>

        {/* RIGHT BUTTON: The Pivot Action (Add to Vault) */}
        <button 
          className="w-full py-3 bg-black text-white rounded-lg font-medium text-sm flex items-center justify-center space-x-2 active:scale-95 transition-transform"
          onClick={() => console.log('Add to Vault clicked')}
        >
          <ShieldCheck size={18} />
          <span>Track in Vault</span>
        </button>
      </div>

      {/* 4. Affiliate / Smart Route Disclaimer (Day 5 Logic) */}
      {asset.sku && (
        <div className="mt-4 pt-4 border-t border-gray-100">
           <a href={`https://google.com/search?q=${asset.sku}`} target="_blank" rel="noreferrer" className="flex items-center justify-center space-x-2 text-xs text-gray-500 hover:text-black transition-colors">
              <span>Compare prices externally</span>
              <ExternalLink size={12} />
           </a>
        </div>
      )}
    </div>
  );
}
