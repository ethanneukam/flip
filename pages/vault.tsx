// pages/vault.tsx
import { useEffect, useState } from 'react';
import Head from 'next/head';
import BottomNav from '../components/layout/BottomNav';
import NetWorthCard from '../components/vault/NetWorthCard';
import { VaultService } from '../lib/vault-service';
import { calculatePortfolio } from '../lib/valuation';
import { VaultAsset, OracleMetric } from '../types/core';
import { ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';

// Mock User ID for demo - in prod, useAuth() hook
const MOCK_USER_ID = 'user_123';

export default function VaultPage() {
  const [assets, setAssets] = useState<VaultAsset[]>([]);
  const [oracleData, setOracleData] = useState<Record<string, OracleMetric>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVault();
  }, []);

  const loadVault = async () => {
    try {
      const { assets, oracleData } = await VaultService.getMyVault(MOCK_USER_ID);
      setAssets(assets);
      setOracleData(oracleData);
    } catch (e) {
      console.error('Failed to load vault', e);
    } finally {
      setLoading(false);
    }
  };

  const stats = calculatePortfolio(assets, oracleData);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Head>
        <title>My Vault | Flip Oracle</title>
      </Head>

      {/* 1. HERO SECTION */}
      <NetWorthCard 
        isLoading={loading}
        totalValue={stats.totalValue}
        dayChangeAbs={stats.dayChangeAbs}
        dayChangePct={stats.dayChangePct}
      />

      {/* 2. ASSET LIST */}
      <div className="px-4 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Assets ({stats.assetCount})</h2>
          <button className="text-xs font-medium text-gray-500">Sort by Value</button>
        </div>

        {loading ? (
          <div className="space-y-3">
             {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-lg animate-pulse" />)}
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">Your vault is empty.</p>
            <Link href="/add" className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium">
              Add First Asset
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {assets.map(asset => {
              const data = oracleData[asset.sku || ''];
              return (
                <div key={asset.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center">
                  {/* Image */}
                  <div className="h-12 w-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                     <img src={asset.image_url} alt={asset.title} className="h-full w-full object-cover" />
                  </div>
                  
                  {/* Details */}
                  <div className="ml-3 flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{asset.title}</h3>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                       <span>{asset.condition_score}/100 Cond</span>
                       {data && <span>• {data.confidence_score}% Conf</span>}
                    </div>
                  </div>

                  {/* Price/Change */}
                  <div className="text-right">
                    {data ? (
                      <>
                        <div className="text-sm font-bold">${data.current_price.toLocaleString()}</div>
                        <div className={`text-xs font-medium ${data.day_change_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {data.day_change_percentage > 0 ? '+' : ''}{data.day_change_percentage}%
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center text-xs text-orange-500">
                        <AlertCircle size={12} className="mr-1" />
                        <span>No Data</span>
                      </div>
                    )}
                  </div>
                  
                  <ArrowRight size={16} className="text-gray-300 ml-3" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}