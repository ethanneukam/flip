import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Check, Shield, Zap, Crown, Terminal, Lock } from "lucide-react";
import { useRouter } from "next/router";

export default function Pricing() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null); // Stores which button is loading
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const handleSubscribe = async (tier: 'base' | 'pro' | 'business') => {
    if (!user) return router.push('/auth');
    
    setLoading(tier); // Show loading spinner on specific button

    try {
      const res = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, tier }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Subscription failed:", err);
      setLoading(null);
    }
  };

  const PricingCard = ({ 
    tier, 
    price, 
    title, 
    level,
    features, 
    recommended = false,
    icon: Icon,
    color
  }: any) => (
    <div className={`relative p-6 border flex flex-col h-full bg-[#0B0E11] transition-all duration-300 group hover:-translate-y-1
      ${recommended 
        ? 'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.1)]' 
        : 'border-white/10 hover:border-white/30'
      }
    `}>
      {/* Background Tech Lines */}
      <div className="absolute top-0 right-0 p-2 opacity-20">
        <Icon size={64} className={color} />
      </div>

      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-sm">
          Recommended Clearance
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-2 ${color}`}>
          {level} // Access Granted
        </div>
        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
          {title}
        </h3>
        <div className="mt-4 flex items-baseline">
          <span className="text-4xl font-bold text-white">${price}</span>
          <span className="text-sm text-gray-500 font-mono ml-2">/MO</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-white/10 mb-6"></div>

      {/* Features */}
      <ul className="flex-1 space-y-4 mb-8">
        {features.map((feature: string, i: number) => (
          <li key={i} className="flex items-start gap-3">
            <Check size={14} className={`mt-1 ${recommended ? 'text-amber-500' : 'text-blue-500'}`} />
            <span className="text-xs font-mono text-gray-300 uppercase">{feature}</span>
          </li>
        ))}
      </ul>

      {/* Action Button */}
      <button
        onClick={() => handleSubscribe(tier)}
        disabled={loading !== null}
        className={`w-full py-3 px-4 text-xs font-black uppercase tracking-widest transition-all
          ${recommended
            ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-900/20'
            : 'bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/40'
          }
        `}
      >
        {loading === tier ? (
          <span className="animate-pulse">Initializing...</span>
        ) : (
          <div className="flex items-center justify-center gap-2">
            {recommended ? <Crown size={14} /> : <Lock size={14} />}
            <span>Request Access</span>
          </div>
        )}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-12 font-sans">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto mb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/10 rounded-full mb-4 bg-white/5">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[9px] font-mono text-white/60 uppercase">System Status: Operational</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4">
          Upgrade Protocol
        </h1>
        <p className="text-gray-500 font-mono text-sm max-w-lg mx-auto">
          Select your required clearance level to unlock advanced oracle data, vision API access, and increased vault capacity.
        </p>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        
        {/* Tier 1: Base */}
        <PricingCard
          tier="base"
          level="Level 1"
          title="Field Operative"
          price="25"
          color="text-blue-500"
          icon={Shield}
          features={[
            "Standard Vault (50 Items)",
            "Daily Market Sync",
            "Basic Price History",
            "Standard Support",
            "1 User Seat"
          ]}
        />

        {/* Tier 2: Pro (Best Value) */}
        <PricingCard
          tier="pro"
          level="Level 2"
          title="Market Maker"
          price="50"
          recommended={true}
          color="text-amber-500"
          icon={Zap}
          features={[
            "Expanded Vault (500 Items)",
            "Real-time Oracle Feed",
            "Vision API (Blue Camera)",
            "Unlimited Scrapes",
            "Priority Execution",
            "AI Price Normalization"
          ]}
        />

        {/* Tier 3: Business */}
        <PricingCard
          tier="business"
          level="Level 3"
          title="Syndicate"
          price="250"
          color="text-red-500"
          icon={Terminal}
          features={[
            "Unlimited Vault Capacity",
            "API Access Key",
            "White-Glove Onboarding",
            "Dedicated Server Node",
            "Custom Scraping Sources",
            "24/7 Direct Line"
          ]}
        />
      </div>

      {/* Bottom Disclaimer */}
      <div className="max-w-7xl mx-auto mt-16 border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center opacity-40">
        <p className="text-[10px] font-mono uppercase">
          Encrypted by Stripe SSL • Cancel Anytime via Terminal Settings
        </p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <Terminal size={16} />
          <Lock size={16} />
        </div>
      </div>
    </div>
  );
}
