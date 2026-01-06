import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import AuthWrapper from "../components/AuthWrapper";
import BottomNav from "../components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { Shield, TrendingUp, Package, PieChart, Settings, Banknote, Loader2 } from "lucide-react";
// NEW: Import the Seller Dashboard
import SellerDashboard from "../components/SellerDashboard";

export default function ProfilePage() {
  const session = useSession();
  const router = useRouter();
  
  const [profile, setProfile] = useState<any>({});
  const [posts, setPosts] = useState<any[]>([]);
  const [totalNetWorth, setTotalNetWorth] = useState(0);
  const [dailyChange, setDailyChange] = useState(0);
  // UPDATED: Added "sales" to the activeTab state
  const [activeTab, setActiveTab] = useState<"vault" | "analytics" | "sales">("vault");
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchVaultData(session.user.id);
    }
  }, [session]);

  const fetchVaultData = async (userId: string) => {
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (prof) setProfile(prof);

    const { data: items } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (items) {
      setPosts(items);
      const total = items.reduce((sum, item) => sum + (1200 * (item.condition_score || 1)), 0);
      setTotalNetWorth(total);
      setDailyChange(total * 0.014);
    }
  };

const handleStripeOnboarding = async () => {
  if (!session?.user?.id) return alert("You must be logged in.");
  
  setOnboardingLoading(true);
  try {
    const response = await fetch("/api/stripe/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: session.user.id }),
    });
    
    const data = await response.json();

    if (response.ok && data.url) {
      // Direct redirect to Stripe's hosted onboarding page
      window.location.href = data.url;
    } else {
      throw new Error(data.error || "Failed to generate onboarding link");
    }
  } catch (err: any) {
    console.error("Stripe Onboarding Error:", err);
    alert(`Error: ${err.message}`);
  } finally {
    setOnboardingLoading(false);
  }
};

  return (
    <AuthWrapper>
      <main className="max-w-md mx-auto pb-24 bg-[#F9FAFB] min-h-screen">
        <div className="bg-black text-white p-8 pt-12 rounded-b-[40px] shadow-2xl relative overflow-hidden">
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

        <div className="px-4 mt-4">
          {!profile.stripe_connect_id ? (
            <button 
              onClick={handleStripeOnboarding}
              disabled={onboardingLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl flex items-center justify-between transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  {onboardingLoading ? <Loader2 className="animate-spin" size={20} /> : <Banknote size={20} />}
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase opacity-80">Seller Action Required</p>
                  <p className="font-bold text-sm">Setup Payouts to Sell Assets</p>
                </div>
              </div>
              <Shield size={18} className="opacity-40 group-hover:opacity-100 transition-opacity" />
            </button>
          ) : (
            <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-center space-x-3">
              <div className="bg-green-500 text-white p-2 rounded-lg"><Shield size={20} /></div>
              <div>
                <p className="text-[10px] font-black text-green-600 uppercase">Merchant Account Active</p>
                <p className="text-sm font-bold text-green-800">Verified for Escrow Payouts</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 px-4 mt-4">
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

        {/* UPDATED: Tabs now include a "Sales" option */}
        <div className="flex p-4 gap-2">
          <button 
            onClick={() => setActiveTab("vault")}
            className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "vault" ? 'bg-black text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
          >
            Vault
          </button>
          <button 
            onClick={() => setActiveTab("sales")}
            className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "sales" ? 'bg-black text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
          >
            Sales
          </button>
          <button 
            onClick={() => setActiveTab("analytics")}
            className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "analytics" ? 'bg-black text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
          >
            Stats
          </button>
        </div>

        <div className="px-4">
          <AnimatePresence mode="wait">
            {activeTab === "vault" && (
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
            )}

            {/* NEW: Render the SellerDashboard when the Sales tab is active */}
            {activeTab === "sales" && (
              <motion.div
                key="sales"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <SellerDashboard userId={session?.user?.id || ""} />
              </motion.div>
            )}

            {activeTab === "analytics" && (
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
