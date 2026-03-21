'use client';
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Key, Activity, ShieldCheck, Copy, Check } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CustomerDashboard() {
  const [apiKeyData, setApiKeyData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      // For now, we fetch our test key. 
      // Later, this will fetch based on the logged-in user's ID.
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key_value', 'FLIP_DEV_TEST_123') 
        .single();

      if (data) setApiKeyData(data);
      setLoading(false);
    }
    fetchDashboardData();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKeyData?.key_value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#e8ff47] font-mono">LOADING_ENCRYPTED_SESSION...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono p-8">
      {/* HEADER */}
      <div className="max-w-4xl mx-auto mb-12 flex justify-between items-end border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">DEVELOPER_PORTAL_V1</h1>
          <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest">Authorized Access: {apiKeyData?.company_name || 'UNKNOWN_ENTITY'}</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-green-500 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">SYSTEM_OPERATIONAL</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* API KEY CARD */}
        <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Key size={80} />
          </div>
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck size={14} className="text-blue-500" /> Your_Production_Key
          </h2>
          <div className="flex items-center gap-3 bg-black border border-white/10 p-4 rounded-lg group">
            <code className="text-blue-400 text-sm flex-1 break-all">
              {apiKeyData?.key_value || '••••••••••••••••'}
            </code>
            <button 
              onClick={copyToClipboard}
              className="p-2 hover:bg-white/5 rounded-md transition-colors text-gray-500 hover:text-white"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
          <p className="text-[9px] text-gray-600 mt-4 leading-relaxed">
            CRITICAL: Do not share this key. If compromised, rotate immediately via the security terminal.
          </p>
        </div>

        {/* USAGE STATS CARD */}
        <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-xl">
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Activity size={14} className="text-[#e8ff47]" /> Usage_Analytics
          </h2>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <span className="text-3xl font-bold">{apiKeyData?.request_count?.toLocaleString() || 0}</span>
              <span className="text-[10px] text-gray-600 mb-1">REQUESTS / 10,000</span>
            </div>
            {/* PROGRESS BAR */}
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#e8ff47] transition-all duration-1000" 
                style={{ width: `${(apiKeyData?.request_count / 10000) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-1">
                <span className="text-[8px] text-gray-700">TIER: ENTERPRISE_LIGHT</span>
                <span className="text-[8px] text-gray-700">RESET: 12_DAYS</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}