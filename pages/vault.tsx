import { useEffect, useState } from 'react';
import Head from 'next/head';
import BottomNav from '../components/layout/BottomNav';
import NetWorthCard from '../components/vault/NetWorthCard';
import { VaultService } from '../lib/vault-service';
import { calculatePortfolio } from '../lib/valuation';
import { VaultAsset, OracleMetric } from '../types/core';
import { ArrowRight, Camera, Loader2, TrendingUp, ShieldCheck, Landmark } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

const performanceData = [
  { value: 42000 }, { value: 45000 }, { value: 43500 },
  { value: 48000 }, { value: 47000 }, { value: 52000 },
];

export default function VaultPage() {
  const [assets, setAssets] = useState<VaultAsset[]>([]);
  const [oracleData, setOracleData] = useState<Record<string, OracleMetric>>({});
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => { loadVault(); }, []);

  const loadVault = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load Profile for Stripe status
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      // Load Assets
      const { assets, oracleData } = await VaultService.getMyVault(user.id);
      setAssets(assets);
      setOracleData(oracleData);
    } catch (e) { 
      console.error('Failed to load vault', e); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSetupPayouts = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/stripe/create-onboarding', { method: 'POST' });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      alert("Connect Error: Verification service offline.");
    } finally {
      setIsProcessing(false);
    }
  };

  const stats = calculatePortfolio(assets, oracleData);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-32 font-mono">
      <Head><title>VAULT | PIVOT</title></Head>
      
      {/* 1. HERO SECTION */}
      <NetWorthCard 
        isLoading={loading} 
        totalValue={stats.totalValue} 
        dayChangeAbs={stats.dayChangeAbs} 
        dayChangePct={stats.dayChangePct} 
      />

      {/* 2. STRIPE CONNECT STATUS */}
      <div className="px-4 mt-4">
        {!profile?.is_merchant_verified ? (
          <button 
            onClick={handleSetupPayouts}
            className="w-full bg-blue-600/10 border border-blue-500/30 p-4 rounded-2xl flex items-center justify-between group hover:bg-blue-600/20 transition-all"
          >
            <div className="flex items-center gap-3">
              <Landmark className="text-blue-500" size={20} />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Merchant_Onboarding</p>
                <p className="text-[9px] text-gray-400 uppercase">Enable P2P Payouts to Bank</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-blue-500 group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <div className="w-full bg-green-500/5 border border-green-500/20 p-3 rounded-2xl flex items-center gap-3">
            <ShieldCheck className="text-green-500" size={18} />
            <span className="text-[9px] font-black uppercase text-green-500 tracking-widest">Payouts_Active_Standard_Escrow</span>
          </div>
        )}
      </div>

      {/* 3. CHART */}
      <div className="px-4 mt-6">
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={12} className="text-blue-500" /> PORTFOLIO_HISTORY
            </h3>
            <span className="text-[10px] font-bold text-green-400">+12.40%</span>
          </div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <Tooltip content={() => null} />
                <Line type="stepAfter" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* 4. ASSET LIST */}
      <div className="px-4 mt-8">
        <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Inventory_Locked ({stats.assetCount})</h2>
        
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-3">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-white/5 p-3 rounded-2xl border border-white/5 flex items-center group hover:border-white/20 transition-all">
                <div className="h-12 w-12 bg-white/10 rounded-xl overflow-hidden flex-shrink-0 border border-white/5">
                  <img src={asset.image_url} className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-[11px] font-black text-white uppercase tracking-tight truncate">{asset.title}</h3>
                  <p className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">SKU: {asset.sku}</p>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-black text-white italic">
                    ${((asset as any).current_value || 0).toLocaleString()}
                  </div>
                  <div className="text-[8px] text-green-500 font-bold uppercase mt-1">Market_Live</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. CAMERA FAB */}
      <div className="fixed bottom-24 right-6 z-50">
        <label className={`flex items-center justify-center w-16 h-16 rounded-2xl shadow-[0_10px_40px_rgba(37,99,235,0.4)] cursor-pointer transition-all active:scale-90 ${isProcessing ? 'bg-gray-800' : 'bg-blue-600'}`}>
          {isProcessing ? <Loader2 className="text-white animate-spin" size={24} /> : <Camera className="text-white" size={24} />}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={() => {}} disabled={isProcessing} />
        </label>
      </div>

      <BottomNav />
    </div>
  );
}
