'use client';

import React, { useState, useEffect } from 'react';
import { Check, Zap, Terminal, ShieldCheck, Globe, Cpu } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const PRICING_TIERS = [
  {
    name: 'Starter',
    id: 'price_1TDrceBg1skeYcWAQn99j4xh',
    price: '1,500',
    limit: '10,000',
    overage: '0.15',
    features: ['Standard Latency', 'Email Support', 'Basic Analytics', '1 API Key'],
    color: 'border-white/10'
  },
  {
    name: 'Growth',
    id: 'price_1TDrhdBg1skeYcWAamLnjjva',
    price: '4,000',
    limit: '50,000',
    overage: '0.08',
    features: ['Priority Routing', '24/7 Chat Support', 'Advanced Usage Logs', '5 API Keys', 'Webhooks'],
    color: 'border-[#e8ff47]/50 shadow-[0_0_20px_rgba(232,255,71,0.1)]',
    popular: true
  },
  {
    name: 'Scale',
    id: 'price_1TDrisBg1skeYcWAT607pXj4',
    price: '8,000',
    limit: '150,000',
    overage: '0.05',
    features: ['Ultra-Low Latency', 'Dedicated Account Manager', 'Custom Rate Limiting', 'Unlimited Keys', 'SLA Guarantee'],
    color: 'border-white/10'
  }
];

export default function PricingPage() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const supabase = createClientComponentClient();

  // 1. Pre-check auth on mount to "warm up" the session
  useEffect(() => {
    const checkUser = async () => {
      await supabase.auth.getSession();
      setIsAuthReady(true);
    };
    checkUser();
  }, [supabase]);

  const handleSubscription = async (priceId: string, tierName: string) => {
    setLoadingId(priceId);
    
    try {
      // 2. Use getSession first - it's faster and more reliable for client-side clicks
      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user;

      // 3. Fallback to getUser only if session check is ambiguous
      if (!user) {
        const { data: { user: verifiedUser } } = await supabase.auth.getUser();
        user = verifiedUser;
      }

      if (!user) {
        // Only redirect if BOTH checks failed
        const currentPath = window.location.pathname;
        window.location.href = `/auth?next=${currentPath}`; // Using /auth based on your previous messages
        return;
      }

      // 4. Proceed to checkout
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_type: 'subscription',
          price_id: priceId,
          tier: tierName,
          user_id: user.id,
          user_email: user.email
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Checkout failed');
      }
    } catch (err) {
      console.error('Subscription error:', err);
      alert('Checkout initialization failed. Please refresh and try again.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono py-20 px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* --- Header --- */}
        <div className="text-center mb-20">
          <h2 className="text-[#e8ff47] text-sm font-bold tracking-[0.3em] uppercase mb-4 italic">
            // Global_Infrastructure_Access
          </h2>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
            QUANTUM_PRICING
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            High-throughput API access for production-grade systems. Scale your 
            operations with guaranteed uptime and low-latency nodes.
          </p>
        </div>

        {/* --- Tiers Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PRICING_TIERS.map((tier) => (
            <div 
              key={tier.id}
              className={`relative bg-[#0a0a0a] border ${tier.color} p-8 rounded-2xl flex flex-col transition-transform hover:scale-[1.02]`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#e8ff47] text-black text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest">
                  Most_Stable
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">${tier.price}</span>
                  <span className="text-gray-500 text-sm">/month</span>
                </div>
              </div>

              <div className="space-y-4 mb-8 flex-grow">
                <div className="pb-4 border-b border-white/5">
                  <p className="text-[#e8ff47] text-xs font-bold uppercase tracking-widest mb-1">Included Usage</p>
                  <p className="text-2xl font-bold">{tier.limit} calls</p>
                  <p className="text-gray-600 text-[10px] mt-1 italic">${tier.overage} per additional call thereafter</p>
                </div>

                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-gray-400">
                      <Check size={14} className="text-[#e8ff47]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleSubscription(tier.id, tier.name)}
                disabled={loadingId === tier.id}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all ${
                  tier.popular 
                    ? 'bg-[#e8ff47] text-black hover:bg-white' 
                    : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loadingId === tier.id ? 'Connecting...' : 'Initialize_Node'}
              </button>
            </div>
          ))}
        </div>

        {/* --- Trust Bar --- */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/5 pt-12">
          {[
            { icon: <Terminal size={18} />, label: 'REST/GraphQL' },
            { icon: <ShieldCheck size={18} />, label: 'AES-256 Auth' },
            { icon: <Globe size={18} />, label: 'Edge-Routing' },
            { icon: <Cpu size={18} />, label: '99.9% Uptime' }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-gray-600 grayscale hover:grayscale-0 transition-all cursor-default">
              <span className="text-[#e8ff47]">{item.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}