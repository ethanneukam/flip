'use client';
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Key, Activity, ShieldCheck, Copy, Check, Loader2 } from 'lucide-react';

// Single client instance
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CustomerDashboard() {
  const [apiKeyData, setApiKeyData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  // 1. Handle Mounting to prevent Hydration Error #310
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // 2. Fetch Data
  useEffect(() => {
    if (!hasMounted) return;

    async function fetchDashboardData() {
      try {
        const { data, error } = await supabase
          .from('api_keys')
          .select('*')
          .eq('key_value', 'FLIP_DEV_TEST_123') 
          .single();

        if (data) setApiKeyData(data);
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [hasMounted]);

  const copyToClipboard = () => {
    if (!apiKeyData?.key_value) return;
    navigator.clipboard.writeText(apiKeyData.key_value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Prevent rendering until the client is ready
  if (!hasMounted) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-[#e8ff47] font-mono">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p className="tracking-widest animate-pulse">ESTABLISHING_SECURE_SESSION...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono p-8">
      <div className="max-w-4xl mx-auto mb-12 flex justify-between items-end border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter italic">FLIP_TERMINAL_ORACLE</h1>
          <p className="text-gray-500 text-[10px] mt-1 uppercase tracking-[0.2em]">
            Auth_Entity: <span className="text-white">{apiKeyData?.company_name || 'GUEST_USER'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-green-500 font-bold tracking-widest uppercase">Node_Active</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* API KEY CARD */}
        <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-xl relative overflow-hidden group hover:border-[#e8ff47]/30 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Key size={80} />
          </div>
          <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck size={14} className="text-blue-500" /> Access_Credential
          </h2>
          <div className="flex items-center gap-3 bg-black border border-white/10 p-4 rounded-lg">
            <code className="text-blue-400 text-sm flex-1 break-all font-bold">
              {apiKeyData?.key_value || 'KEY_NOT_FOUND'}
            </code>
            <button 
              onClick={copyToClipboard}
              className="p-2 hover:bg-white/10 rounded-md transition-colors text-gray-500 hover:text-white"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* USAGE STATS CARD */}
        <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-xl hover:border-[#e8ff47]/30 transition-colors">
          <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Activity size={14} className="text-[#e8ff47]" /> Throughput_Monitor
          </h2>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <span className="text-4xl font-black tracking-tighter">{apiKeyData?.request_count?.toLocaleString() || 0}</span>
              <span className="text-[10px] text-gray-600 mb-1 font-bold">/ 10,000 REQ</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#e8ff47] shadow-[0_0_10px_#e8ff47]" 
                style={{ width: `${Math.min((apiKeyData?.request_count / 10000) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}