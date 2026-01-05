import { useEffect, useState } from 'react';
import Head from 'next/head';
import BottomNav from '../components/BottomNav';
import NetWorthCard from '../components/vault/NetWorthCard';
import { VaultService } from '../lib/vault-service';
import { calculatePortfolio } from '../lib/valuation';
import { VaultAsset, OracleMetric } from '../types/core';
import { ArrowRight, Camera, Loader2, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';

const MOCK_USER_ID = 'user_123';

// Mock data for the Portfolio chart
const performanceData = [
  { value: 42000 },
  { value: 45000 },
  { value: 43500 },
  { value: 48000 },
  { value: 47000 },
  { value: 52000 },
];

export default function VaultPage() {
  const [assets, setAssets] = useState<VaultAsset[]>([]);
  const [oracleData, setOracleData] = useState<Record<string, OracleMetric>>({});
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { loadVault(); }, []);

  const loadVault = async () => {
    try {
      const { assets, oracleData } = await VaultService.getMyVault(MOCK_USER_ID);
      setAssets(assets);
      setOracleData(oracleData);
    } catch (e) { console.error('Failed to load vault', e); }
    finally { setLoading(false); }
  };

  const handleLiquidate = async (asset: VaultAsset) => {
    const confirmSale = confirm(`Liquidate ${asset.title} for an instant payout?`);
    if (!confirmSale) return;
    setIsProcessing(true);
    try {
      const payoutAmount = (asset as any).current_value * 0.90;
      const { error } = await supabase.from('user_assets').delete().eq('id', asset.id);
      if (error) throw error;
      alert(`Liquidation Successful. $${payoutAmount.toLocaleString()} credited.`);
      loadVault();
    } catch (err) {
      alert("Liquidation failed. Market spread too high.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Image = (reader.result as string).split(',')[1];
        const aiRes = await fetch('/api/ai-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image }),
        });
        const { productName } = await aiRes.json();
        const scrapeRes = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: productName }),
        });
        const marketData = await scrapeRes.json();
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('user_assets').insert({
          user_id: user?.id || MOCK_USER_ID,
          title: productName,
          sku: productName.substring(0, 8).toUpperCase(),
          current_value: marketData.flipPrice || 0,
          image_url: marketData.image || "https://via.placeholder.com/150",
          condition_score: 100
        });
        await loadVault();
        setIsProcessing(false);
      };
    } catch (err) {
      console.error("Vault Chain Error:", err);
      setIsProcessing(false);
    }
  };

  const stats = calculatePortfolio(assets, oracleData);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Head><title>My Vault | Flip Oracle</title></Head>
      
      {/* 1. HERO SECTION */}
      <NetWorthCard isLoading={loading} totalValue={stats.totalValue} dayChangeAbs={stats.dayChangeAbs} dayChangePct={stats.dayChangePct} />

      {/* 2. PORTFOLIO PERFORMANCE CHART */}
      <div className="px-4 mt-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
              <TrendingUp size={12} className="mr-1 text-blue-500" /> Portfolio_Performance
            </h3>
            <span className="text-[10px] font-bold text-green-600">+12.4%</span>
          </div>
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <Tooltip content={() => null} />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* 3. ASSET LIST */}
      <div className="px-4 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Assets ({stats.assetCount})</h2>
        </div>
        
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-lg animate-pulse" />)}</div>
        ) : assets.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">Your vault is empty.</p>
            <Link href="/add" className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium">
              Add First Asset
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div className="h-12 w-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={asset.image_url} className="h-full w-full object-cover" />
                </div>

                <div className="ml-3 flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{asset.title}</h3>
                </div>

                <div className="text-right flex items-center space-x-3">
                  <div>
                    <div className="text-sm font-bold">
                      ${((asset as any).current_value || 0).toLocaleString()}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLiquidate(asset);
                      }}
                      className="mt-1 px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase rounded hover:bg-red-500 hover:text-white transition-all"
                    >
                      Liquidate
                    </button>
                  </div>
                  <ArrowRight size={16} className="text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. CAMERA BUTTON */}
      <div className="fixed bottom-28 right-6 z-50">
        <label className={`flex items-center justify-center w-14 h-14 rounded-full shadow-2xl cursor-pointer transition-all active:scale-90 ${isProcessing ? 'bg-gray-400' : 'bg-blue-600'}`}>
          {isProcessing ? <Loader2 className="text-white animate-spin" size={24} /> : <Camera className="text-white" size={24} />}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture} disabled={isProcessing} />
        </label>
      </div>

      {/* 5. PROCESSING OVERLAY */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center text-white p-6 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
          <p className="font-bold uppercase tracking-widest text-sm">AI_Oracle_Analyzing...</p>
          <p className="text-[10px] text-gray-300 mt-2 font-mono">IDENTIFYING ASSET & CALIBRATING PRICE</p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
