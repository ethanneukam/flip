import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Check, Shield, Zap, Crown, Terminal, Lock, AlertTriangle } from "lucide-react";
import { useRouter } from "next/router";
import BottomNav from "@/components/BottomNav"; // Ensure path is correct

export default function Pricing() {
  const [user, setUser] = useState<any>(null);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase.from('profiles').select('tier').eq('id', user.id).single();
        setCurrentTier(data?.tier || 'free');
      }
    };
    fetchUser();
  }, []);

  const handleSubscribe = async (tier: 'base' | 'pro' | 'business') => {
    if (!user) return router.push('/auth');
    setLoading(tier);

    try {
      const res = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, tier, email: user.email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Subscription Protocol Failure:", err);
      alert("Terminal Error: Checkout session could not be initialized.");
    } finally {
      setLoading(null);
    }
  };

  const PricingCard = ({ tier, price, title, level, features, recommended, icon: Icon, color }: any) => {
    const isCurrent = currentTier === tier;
    return (
      <div className={`relative p-6 border flex flex-col h-full bg-[#0B0E11] transition-all duration-300 group ${
        recommended ? 'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.1)]' : 'border-white/10'
      }`}>
        <div className="absolute top-0 right-0 p-2 opacity-10"><Icon size={64} className={color} /></div>
        <div className="mb-6">
          <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-2 ${color}`}>{level} // Access</div>
          <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{title}</h3>
          <div className="mt-4 flex items-baseline">
            <span className="text-4xl font-bold text-white">${price}</span>
            <span className="text-xs text-white/30 font-mono ml-2">/MO</span>
          </div>
        </div>
        <ul className="flex-1 space-y-4 mb-8">
          {features.map((f: any, i: number) => (
            <li key={i} className="flex items-start gap-3">
              <Check size={14} className={recommended ? 'text-amber-500' : 'text-blue-500'} />
              <span className="text-[10px] font-mono text-white/60 uppercase leading-tight">{f}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => !isCurrent && handleSubscribe(tier)}
          disabled={loading !== null || isCurrent}
          className={`relative z-20 w-full py-4 px-4 text-[10px] font-black uppercase tracking-widest transition-all ${
            isCurrent ? 'bg-white/5 border border-white/10 text-white/20 cursor-not-allowed' :
            recommended ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {loading === tier ? "INITIALIZING..." : isCurrent ? "CURRENT_LEVEL" : "REQUEST_ACCESS"}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-32 md:p-12 font-sans overflow-x-hidden">
      <div className="max-w-7xl mx-auto mb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/10 rounded-full mb-4 bg-white/5 font-mono text-[9px] uppercase tracking-widest">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Identity & Fraud Status: Secure
        </div>
        <h1 className="text-5xl font-black uppercase tracking-tighter italic">Upgrade_Protocol</h1>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <PricingCard tier="base" level="LVL_01" title="Operative" price="25" color="text-blue-500" icon={Shield} features={["50 Vault Items", "Daily Sync", "Standard Support"]}/>
        <PricingCard tier="pro" level="LVL_02" title="Market Maker" price="50" recommended={true} color="text-amber-500" icon={Zap} features={["500 Vault Items", "Real-Time Oracle", "Vision API Access", "Advanced Word Scraper"]}/>
        <PricingCard tier="business" level="LVL_03" title="Syndicate" price="250" color="text-red-500" icon={Terminal} features={["Unlimited Vault", "Direct API Key", "White-Glove Support", "Dedicated Scrape Nodes"]}/>
      </div>

      {/* Compliance & Identity Footer */}
      <div className="max-w-7xl mx-auto mt-20 border-t border-white/10 pt-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 opacity-50 text-[10px] font-mono uppercase">
          <div className="space-y-4">
            <p className="text-white font-black">Identity_Fraud</p>
            <p>• Device Fingerprinting v4.2</p>
            <p>• Seller Risk Signal Analysis</p>
            <p>• 3D Secure 2.0 Enforcement</p>
          </div>
          <div className="space-y-4">
            <p className="text-white font-black">PCI_DSS_Protocol</p>
            <p>• Level 1 Compliant Gateway</p>
            <p>• AES-256 Tokenization</p>
            <p>• Zero Card Data Storage Policy</p>
          </div>
          <div className="space-y-4">
            <p className="text-white font-black">Legal_Terms</p>
            <p className="cursor-pointer hover:text-white">Privacy_Policy.pdf</p>
            <p className="cursor-pointer hover:text-white">Terms_of_Service.log</p>
            <p className="cursor-pointer hover:text-white">Refund_Logic.v1</p>
          </div>
          <div className="space-y-4">
            <p className="text-white font-black">System_Notes</p>
            <p>Auto-Refunds applied for downtime {'>'} 1.2%</p>
            <p>Bank Chargeback Prevention: Active</p>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
