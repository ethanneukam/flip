import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import AuthWrapper from "../components/AuthWrapper";
import BottomNav from "../components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { Shield, TrendingUp, TrendingDown, Package, PieChart, Settings } from "lucide-react";

export default function ProfilePage() {
  const session = useSession();
  const router = useRouter();
  
  const [profile, setProfile] = useState<any>({});
  const [posts, setPosts] = useState<any[]>([]);
  const [totalNetWorth, setTotalNetWorth] = useState(0);
  const [dailyChange, setDailyChange] = useState(0);
  const [activeTab, setActiveTab] = useState<"vault" | "analytics">("vault");

  useEffect(() => {
    if (session?.user?.id) {
      fetchVaultData(session.user.id);
    }
  }, [session]);

  const fetchVaultData = async (userId: string) => {
    // 1. Get Profile
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (prof) setProfile(prof);

    // 2. Get Vault Items (Day 10 Logic: Valuation)
    const { data: items } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (items) {
      setPosts(items);
      // Valuation Engine: Summing item values (using condition_score as a multiplier for mock base price)
      // In a real scenario, this would join with your Oracle price table
      const total = items.reduce((sum, item) => sum + (1200 * (item.condition_score || 1)), 0);
      setTotalNetWorth(total);
      setDailyChange(total * 0.014); // Mocking a 1.4% daily gain
    }
  };

  return (
    <AuthWrapper>
      <main className="max-w-md mx-auto pb-24 bg-[#F9FAFB] min-h-screen">
        {/* --- Phase 2: Vault Header --- */}
        <div className="bg-black text-white p-8 pt-12 rounded-b-[40px] shadow-2xl relative overflow-hidden">
          {/* Background Decorative Element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl border border-white/20 overflow-hidden bg-gray-800">
                <img src={profile.avatar_url || "/default-avatar.png"} className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Secure Vault</p>
                <h1 className="text-lg font-bold tracking-tight">@{profile.username}</h1>
              </div>
            </div>
            <button onClick={() => router.push("/edit-profile")} className="p-2 bg-white/10 rounded-xl">
              <Settings size={18} />
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Estimated Net Worth</p>
            <div className="flex items-baseline space-x-2">
              <h2 className="text-4xl font-black italic tracking-tighter">
                ${totalNetWorth.toLocaleString()}
              </h2>
              <div className="flex items-center text-xs font-bold text-green-400">
                <TrendingUp size={12} className="mr-1" />
                +1.4%
              </div>
            </div>
          </div>
        </div>

        {/* --- Quick Actions --- */}
        <div className="grid grid-cols-2 gap-4 px-4 -mt-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-3">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Package size={20} /></div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase">Assets</p>
              <p className="font-bold">{posts.length}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-3">
            <div className="bg-green-50 p-2 rounded-lg text-green-600"><Shield size={20} /></div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase">Status</p>
              <p className="font-bold text-xs">VERIFIED</p>
            </div>
          </div>
        </div>

        {/* --- Tabs --- */}
        <div className="flex p-4 gap-4">
          <button 
            onClick={() => setActiveTab("vault")}
            className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "vault" ? 'bg-black text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
          >
            Vault Assets
          </button>
          <button 
            onClick={() => setActiveTab("analytics")}
            className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "analytics" ? 'bg-black text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
          >
            Analytics
          </button>
        </div>

        {/* --- Tab Content --- */}
        <div className="px-4">
          <AnimatePresence mode="wait">
            {activeTab === "vault" ? (
              <motion.div 
                key="vault"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-4"
              >
                {posts.map((p) => (
                  <div key={p.id} className="bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm group">
                    <div className="aspect-square relative">
                      <img src={p.image_url} className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-[8px] font-bold text-white px-2 py-1 rounded-full uppercase">
                        {p.category}
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] font-black uppercase truncate">{p.title}</p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="font-mono text-[10px] text-gray-400 uppercase">{p.sku || 'No SKU'}</p>
                        <p className="text-xs font-black text-blue-600">${(1200 * (p.condition_score || 1)).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                key="analytics"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-[32px] border border-gray-100 text-center space-y-4"
              >
                <PieChart size={48} className="mx-auto text-gray-200" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Portfolio Distribution coming in Phase 7</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <BottomNav />
      </main>
    </AuthWrapper>
  );
}
