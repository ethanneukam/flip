import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import BottomNav from '../components/BottomNav';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ShieldAlert, Loader2, ArrowUpRight, ArrowDownRight, Smartphone, Settings } from 'lucide-react';
import router from 'next/router';

export default function VaultPage() {
  const [session, setSession] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    if (session) {
      loadVaultData(session.user.id);
    } else {
      setLoading(false);
    }
  }

  async function loadVaultData(userId: string) {
    const { data } = await supabase.from('items').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setAssets(data || []);
    setLoading(false);
  }

  const totalEquity = useMemo(() => {
    return assets.reduce((acc, item) => acc + (item.current_value || 0), 0);
  }, [assets]);

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
  );

  // LOCKED STATE: Secure Connection Lost
  if (!session) return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-8 font-mono">
      <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <ShieldAlert className="text-red-500" size={32} />
      </div>
      <h1 className="text-xl font-black uppercase tracking-[0.2em] text-center">Connection_Lost</h1>
      <p className="text-gray-500 text-[10px] uppercase mt-2 tracking-widest text-center max-w-[240px] leading-relaxed">
        Vault access requires an initialized identity session.
      </p>
      <button 
        onClick={() => router.push('/login')}
        className="mt-8 bg-white text-black px-8 py-4 rounded-sm font-black uppercase text-xs tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all"
      >
        Initialize_Login
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808] text-white pb-32 font-mono">
      <Head><title>VAULT_LEDGER</title></Head>

      {/* 1. TOP NAV / STATUS */}
      <div className="p-6 flex justify-between items-center opacity-50">
        <div className="flex items-center gap-2">
          <Lock size={12} className="text-blue-500" />
          <span className="text-[9px] font-black uppercase tracking-widest">Encrypted_Session</span>
        </div>
        <Settings size={16} />
      </div>

      {/* 2. TOTAL EQUITY HEADER */}
      <div className="px-6 py-10">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-2 text-center">Total_Personal_Equity</p>
        <h1 className="text-5xl font-black tracking-tighter text-center">
          ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </h1>
        <div className="flex justify-center mt-4">
          <div className="flex items-center gap-1 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
            <ArrowUpRight size={12} className="text-green-500" />
            <span className="text-[10px] font-black text-green-500">+4.2% (24H)</span>
          </div>
        </div>
      </div>

      {/* 3. ASSET GRID */}
      <div className="px-6 space-y-4">
        <div className="flex justify-between items-end mb-6">
            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Asset_Ledger</h2>
            <span className="text-[10px] text-gray-700">{assets.length} Units</span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {assets.map((asset) => (
            <motion.div 
              key={asset.id} 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-[#111] border border-white/5 p-4 flex items-center gap-4 group"
            >
              <div className="h-14 w-14 bg-black border border-white/10 rounded-sm overflow-hidden flex-shrink-0">
                <img src={asset.image_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-black uppercase truncate tracking-tight">{asset.title}</h3>
                <p className="text-[9px] text-gray-600 uppercase font-bold">QTY: 1 // {asset.sku || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black italic">${(asset.current_value || 0).toLocaleString()}</p>
                <div className="text-[8px] font-black text-green-500 uppercase flex items-center justify-end gap-1">
                  <ArrowUpRight size={8} /> 12%
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}