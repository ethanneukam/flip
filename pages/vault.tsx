import { useEffect, useState } from 'react';
import Head from 'next/head';
import BottomNav from '../components/BottomNav';
import NetWorthCard from '../components/vault/NetWorthCard';
import { VaultService } from '../lib/vault-service';
import { calculatePortfolio } from '../lib/valuation';
import { VaultAsset, OracleMetric } from '../types/core';
import { ArrowRight, AlertCircle, Camera, Loader2 } from 'lucide-react'; // Added icons
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient'; // Added supabase import

// Mock User ID for demo - in prod, useAuth() hook
const MOCK_USER_ID = 'user_123';

export default function VaultPage() {
  const [assets, setAssets] = useState<VaultAsset[]>([]);
  const [oracleData, setOracleData] = useState<Record<string, OracleMetric>>({});
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // Added processing state

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

  // AI SCAN LOGIC (3a)
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      // 1. Convert to Base64 for the AI API
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Image = (reader.result as string).split(',')[1];

        // 2. Identify Item via AI Scan
        const aiRes = await fetch('/api/ai-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image }),
        });
        const { productName } = await aiRes.json();

        // 3. Get Flip Price via Scraper
        const scrapeRes = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: productName }),
        });
        const marketData = await scrapeRes.json();

        // 4. Automatic Vault Add (Supabase)
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('user_assets').insert({
          user_id: user?.id || MOCK_USER_ID,
          title: productName,
          sku: productName.substring(0, 8).toUpperCase(),
          current_value: marketData.flipPrice || 0,
          image_url: marketData.image || "https://via.placeholder.com/150",
          condition_score: 100 // Default for new scan
        });

        // 5. Refresh the list
        await loadVault();
        setIsProcessing(false);
      };
    } catch (err) {
      console.error("AI Scan Failed:", err);
      setIsProcessing(false);
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

      {/* AI SCAN FLOATING BUTTON */}
      <div className="fixed bottom-28 right-6 z-50">
        <label className={`flex items-center justify-center w-14 h-14 rounded-full shadow-2xl cursor-pointer transition-all active:scale-90 ${isProcessing ? 'bg-gray-400' : 'bg-blue-600'}`}>
          {isProcessing ? (
            <Loader2 className="text-white animate-spin" size={24} />
          ) : (
            <Camera className="text-white" size={24} />
          )}
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            onChange={handlePhotoCapture} 
            disabled={isProcessing}
          />
        </label>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center text-white p-6 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
          <p className="font-bold uppercase tracking-widest text-sm">AI_Oracle_Analyzing...</p>
          <p className="text-[10px] text-gray-400 mt-2">Identifying asset and calculating market value</p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}