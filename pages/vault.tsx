import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import BottomNav from '../components/BottomNav';
import NetWorthCard from '../components/vault/NetWorthCard';
import { VaultService } from '../lib/vault-service';
import { calculatePortfolio } from '../lib/valuation';
import { VaultAsset, OracleMetric } from '../types/core';
import { 
  ArrowRight, Camera, Loader2, TrendingUp, ShieldCheck, 
  Landmark, Settings, User, MapPin, X, Package, BarChart3, Receipt,
  Truck
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, // Add this
  Tooltip 
} from 'recharts';
import SellerDashboard from "../components/SellerDashboard";
import { motion, AnimatePresence } from "framer-motion";
import CameraScanner from '../components/vault/CameraScanner';
import { uploadImage } from '../lib/uploadImage'; // <-- Check this path!
import router from 'next/router';

export default function VaultPage() {
  const [assets, setAssets] = useState<VaultAsset[]>([]);
  const [oracleData, setOracleData] = useState<Record<string, OracleMetric>>({});
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"inventory" | "sales" | "stats">("inventory");
  const [showSettings, setShowSettings] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

const handleOracleScan = async (file: File) => {
  setIsScannerOpen(false);
  setIsScanning(true);
  
  try {
    // 1. Authenticate Request
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("AUTH_REQUIRED");

    // 2. Upload to Supabase Storage
    const url = await uploadImage(file);
    if (!url) throw new Error("UPLOAD_FAILED");

    // 3. Analyze with Google Vision AI
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: url })
    });
    
    const scanResult = await res.json();
    
    // 4. Secure in Vault (Insert into Database)
    const newItem = {
      user_id: user.id,
      title: scanResult.suggestion || 'Unknown Asset',
      sku: scanResult.probableSku || 'PENDING',
      image_url: url,
      condition_score: scanResult.conditionScore || 1.0,
      current_value: 0, // Value can be updated later by a pricing job
    };

    const { data: insertedAsset, error } = await supabase
      .from('items')
      .insert(newItem)
      .select()
      .single();

    if (error) throw error;

    // 5. Instantly update the UI (Injects to the top of the list)
    if (insertedAsset) {
      setAssets(prev => [insertedAsset as VaultAsset, ...prev]);
    }

    // 6. Feedback
    console.log("ORACLE_ANALYSIS:", scanResult);
    alert(`ASSET SECURED: ${scanResult.suggestion} locked in Vault.`);
    
  } catch (err: any) {
    console.error("ORACLE_FAILURE:", err);
    alert(`SYSTEM_ERROR: ${err.message || "Could not complete scan."}`);
  } finally {
    setIsScanning(false);
  }
};
  // Address State for Shippo
  const [address, setAddress] = useState({
    full_name: '',
    address_line1: '',
    city: '',
    state: '',
    zip: ''
  });

  useEffect(() => { loadVault(); }, []);

  const loadVault = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);
      if (prof) {
        setAddress({
          full_name: prof.full_name || '',
          address_line1: prof.address_line1 || '',
          city: prof.city || '',
          state: prof.state || '',
          zip: prof.zip || ''
        });
      }

      const { assets, oracleData } = await VaultService.getMyVault(user.id);
      setAssets(assets);
      setOracleData(oracleData);
    } catch (e) {
      console.error('Failed to load vault', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAddress = async () => {
    setIsProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('profiles').update(address).eq('id', user?.id);
    if (!error) {
      setShowSettings(false);
      alert("Shipping Info Updated");
    }
    setIsProcessing(false);
  };

  const handleSetupPayouts = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/stripe/onboard', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id })
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      alert("Connect Error: Verification service offline.");
    } finally {
      setIsProcessing(false);
    }
  };

const portfolioStats = useMemo(() => {
  if (!assets) return { total: 0, pnl: 0, count: 0 };
  
  // Using 'assets' as per your JSX mapping
  const total = assets.reduce((acc, item) => acc + ((item as any).price || (item as any).current_value || 0), 0);
  const costBasis = assets.reduce((acc, item) => acc + ((item as any).acquired_price || 0), 0);
  const pnl = total - costBasis;
  
  return { 
    total, 
    pnl, 
    count: assets.length 
  };
}, [assets]);
  const stats = calculatePortfolio(assets, oracleData);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-32 font-mono">
      <Head><title>VAULT | PIVOT</title></Head>

      {/* HEADER SECTION */}
      <div className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black">P</div>
          <span className="text-[10px] font-black tracking-widest uppercase">Vault_Secure</span>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2 bg-white/5 rounded-xl border border-white/10">
          <Settings size={18} className="text-gray-400" />
        </button>
      </div>
      <div className="flex items-center gap-2">
    {/* NEW OPS CENTER BUTTON */}
    <button 
      onClick={() => router.push('/ops')}
      className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
    >
      <Truck size={14} className="text-blue-500" />
      <span className="text-[9px] font-black uppercase tracking-tight text-white/70">Ops_Center</span>
    </button>

    <button onClick={() => setShowSettings(true)} className="p-2 bg-white/5 rounded-xl border border-white/10">
      <Settings size={18} className="text-gray-400" />
    </button>
    <button 
  onClick={() => router.push('/ops')}
  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
>
  <Truck size={14} />
  <span className="text-[10px] font-black uppercase tracking-widest">Active_Ops</span>
</button>
  </div>
      <NetWorthCard 
        isLoading={loading} 
        totalValue={stats.totalValue} 
        dayChangeAbs={stats.dayChangeAbs} 
        dayChangePct={stats.dayChangePct} 
      />

      {/* TABS SELECTOR */}
      <div className="flex px-4 mt-6 gap-2">
        {[
          { id: 'inventory', label: 'Items', icon: Package },
          { id: 'sales', label: 'Sales', icon: Receipt },
          { id: 'stats', label: 'Stats', icon: BarChart3 }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border ${
              activeTab === tab.id 
              ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' 
              : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
            }`}
          >
            <tab.icon size={12} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 mt-6">
        <AnimatePresence mode="wait">
          {/* TAB 1: INVENTORY */}
          {activeTab === "inventory" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="inventory">
              {/* STRIPE STATUS BANNER */}
              {!profile?.stripe_connect_id && (
                <button onClick={handleSetupPayouts} className="w-full mb-6 bg-blue-600/10 border border-blue-500/30 p-4 rounded-2xl flex items-center justify-between group">
                  <div className="flex items-center gap-3 text-left">
                    <Landmark className="text-blue-500" size={20} />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Merchant_Onboarding</p>
                      <p className="text-[9px] text-gray-400 uppercase">Enable P2P Payouts to Bank</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-blue-500 group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Inventory_Locked ({assets.length})</h2>
              <div className="space-y-3">
                {assets.map((asset) => (
                  <div key={asset.id} className="bg-white/5 p-3 rounded-2xl border border-white/5 flex items-center group hover:border-white/20">
                    <div className="h-12 w-12 bg-white/10 rounded-xl overflow-hidden border border-white/5">
                      <img src={asset.image_url} className="h-full w-full object-cover grayscale group-hover:grayscale-0" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-[11px] font-black text-white uppercase truncate">{asset.title}</h3>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">SKU: {asset.sku || 'PENDING'}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[12px] font-black text-white italic"> ${((asset as any).price || (asset as any).current_value || 0).toLocaleString()}</div>
                      <div className="text-[8px] text-green-500 font-bold uppercase mt-1">Live_Oracle</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 2: SALES */}
          {activeTab === "sales" && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key="sales">
              <SellerDashboard userId={profile?.id || ""} />
            </motion.div>
          )}

          {/* TAB 3: STATS */}
{activeTab === "stats" && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              key="stats" 
              className="space-y-4"
            >
              {/* 1. Value Hero Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl">
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Total_Equity</p>
                  <p className="text-2xl font-black text-white">${portfolioStats.total.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Net_PNL</p>
                  <p className={`text-2xl font-black ${portfolioStats.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {portfolioStats.pnl >= 0 ? '+' : ''}${portfolioStats.pnl.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* 2. Growth Trajectory */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="flex justify-between items-center mb-6">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Equity_Curve_v1.0</p>
                  <span className="text-[8px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded border border-green-500/30">LIVE_DATA</span>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[{v: portfolioStats.total * 0.8}, {v: portfolioStats.total * 0.95}, {v: portfolioStats.total}]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px', borderRadius: '8px' }}
                        itemStyle={{ color: '#3b82f6' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="v" 
                        stroke="#3b82f6" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} 
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3. Risk Distribution */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">Risk_Distribution</p>
                <div className="space-y-3">
                  {['High Volatility', 'Stable Assets', 'Arbitrage Pending'].map((label, i) => (
                    <div key={label}>
                      <div className="flex justify-between text-[9px] mb-1 uppercase font-bold text-gray-400">
                        <span>{label}</span>
                        <span>{75 - (i * 20)}%</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-1000" 
                          style={{ width: `${75 - (i * 20)}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>



      {/* SETTINGS MODAL (Address for Shippo) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black italic tracking-tighter uppercase">Vault_Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 bg-white/10 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Full_Name</label>
                <input value={address.full_name} onChange={e => setAddress({...address, full_name: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:border-blue-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Shipping_Address</label>
                <input value={address.address_line1} onChange={e => setAddress({...address, address_line1: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:border-blue-500 outline-none" placeholder="123 Pivot Way" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input value={address.city} onChange={e => setAddress({...address, city: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl" placeholder="City" />
                <input value={address.state} onChange={e => setAddress({...address, state: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl" placeholder="State" />
              </div>
              <input value={address.zip} onChange={e => setAddress({...address, zip: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl" placeholder="Zip Code" />
            </div>

            <button onClick={handleUpdateAddress} disabled={isProcessing} className="mt-auto w-full bg-blue-600 p-5 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2">
              {isProcessing ? <Loader2 className="animate-spin" /> : 'Update_Identity_Data'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI ORACLE TRIGGER */}
<div className="fixed bottom-24 right-6 z-50">
  <button 
    onClick={() => setIsScannerOpen(true)}
    disabled={isScanning}
    className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-[0_10px_40px_rgba(37,99,235,0.4)] active:scale-90 transition-all disabled:opacity-50"
  >
    {isScanning ? (
      <Loader2 className="animate-spin text-white" size={24} />
    ) : (
      <Camera className="text-white" size={24} />
    )}
  </button>
</div>

{/* CAMERA OVERLAY */}
{isScannerOpen && (
  <CameraScanner 
    onClose={() => setIsScannerOpen(false)} 
    onCapture={handleOracleScan} 
  />
)}

      <BottomNav />
    </div>
  );
}
