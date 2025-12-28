// pages/vault/index.tsx
import { useEffect, useState } from 'react';
import { getUserPortfolio } from '@/lib/portfolio';
import { supabase } from '@/lib/supabaseClient';
import BottomNav from '@/components/BottomNav';
import { TrendingUp, TrendingDown, Shield, Wallet, ChevronRight } from 'lucide-react';

export default function VaultDashboard() {
  const [stats, setStats] = useState({ totalValue: 0, avgChange: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVault() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const data = await getUserPortfolio(user.id);
        setStats(data);
      }
      setLoading(false);
    }
    loadVault();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <header className="p-6 pt-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">System Live</span>
          </div>
          <Shield size={20} className="text-gray-700" />
        </div>

        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Portfolio Net Worth</p>
        <h1 className="text-5xl font-black italic tracking-tighter mb-4">
          ${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </h1>
        
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
          stats.avgChange >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
        }`}>
          {stats.avgChange >= 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
          {stats.avgChange.toFixed(2)}% <span className="ml-2 opacity-50 font-medium">LAST 24H</span>
        </div>
      </header>

      <main className="px-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-white/5 rounded-[24px] p-5">
            <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Assets</p>
            <p className="text-xl font-bold">{stats.count}</p>
          </div>
          <div className="bg-gray-900 border border-white/5 rounded-[24px] p-5">
            <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Status</p>
            <p className="text-xl font-bold text-blue-400">SECURE</p>
          </div>
        </div>

        {/* Action List */}
        <div className="pt-8 space-y-2">
          <button className="w-full bg-white text-black p-5 rounded-[24px] font-black uppercase text-xs flex items-center justify-between">
            <span>Withdrawal Liquidity</span>
            <ChevronRight size={18} />
          </button>
          <button className="w-full bg-gray-900 text-white border border-white/5 p-5 rounded-[24px] font-black uppercase text-xs flex items-center justify-between">
            <span>Export Tax Oracle Report</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
