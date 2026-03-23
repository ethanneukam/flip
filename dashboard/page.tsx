'use client';
import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Terminal, Key, Activity, Copy, Check, Zap, AlertCircle } from 'lucide-react';

export default function DeveloperDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [apiKey, setApiKey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function loadDevData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get Profile (Tier/Usage) and API Key
      const [pRes, kRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('api_keys').select('*').eq('user_id', user.id).single()
      ]);

      setProfile(pRes.data);
      setApiKey(kRes.data);
      setLoading(false);
    }
    loadDevData();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey?.key_value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-mono text-[#e8ff47]">LOADING_ENCRYPTED_SESSION...</div>;

  const isPaid = profile?.tier && profile.tier !== 'free';
  const limit = profile?.tier === 'Starter' ? 10000 : profile?.tier === 'Growth' ? 50000 : 150000;
  const usagePercent = Math.min(((profile?.request_count || 0) / limit) * 100, 100);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-end border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <Terminal className="text-[#e8ff47]" size={24} /> 
              DEV_PORTAL_V1.0
            </h1>
            <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest">
              Status: <span className={isPaid ? "text-green-500" : "text-amber-500"}>{isPaid ? 'ACTIVE_SUBSCRIPTION' : 'SANDBOX_MODE'}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase">Current_Tier</p>
            <p className="text-[#e8ff47] font-bold tracking-tighter">{profile?.tier || 'FREE'}</p>
          </div>
        </div>

        {!isPaid && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg flex items-center gap-4">
            <AlertCircle className="text-amber-500" />
            <p className="text-xs text-amber-200">Your account is in Sandbox. Upgrade to a production tier to increase rate limits and remove watermarks.</p>
          </div>
        )}

        {/* API Key Section */}
        <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-xl">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Key size={14} /> Production_API_Key
          </h2>
          <div className="flex items-center gap-2 bg-black border border-white/5 p-2 rounded-lg">
            <code className="flex-grow text-[#e8ff47] px-2">{apiKey?.key_value || '••••••••••••••••'}</code>
            <button 
              onClick={copyToClipboard}
              className="p-2 hover:bg-white/5 rounded transition-colors text-gray-400"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
        
        {/* QUICK START SNIPPET */}
<div className="mt-6 bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden">
  <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex justify-between items-center">
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quick_Start_Python</span>
    <button 
      onClick={() => {
        navigator.clipboard.writeText(`import requests\n\nheaders = {"X-API-KEY": "${apiKey?.key_value}"}\n\nresponse = requests.get("https://api.flip-terminal.com/api/v1/pricing/iPhone%2015", headers=headers)\nprint(response.json())`);
        alert("Snippet Copied!");
      }}
      className="text-[10px] text-[#e8ff47] hover:underline"
    >
      COPY_CODE
    </button>
  </div>
  <pre className="p-4 overflow-x-auto text-xs text-gray-300 font-mono leading-relaxed">
    <code>
      <span className="text-purple-400">import</span> requests{"\n\n"}
      headers = {"{"}{"\n"}
      {"  "}<span className="text-green-400">"X-API-KEY"</span>: <span className="text-[#e8ff47]">"{apiKey?.key_value || 'flp_your_key_here'}"</span>{"\n"}
      {"}"}{"\n\n"}
      response = requests.get({"\n"}
      {"  "}<span className="text-green-400">"https://api.flip-terminal.com/api/v1/pricing/iPhone%2015"</span>, {"\n"}
      {"  "}headers=headers{"\n"}
      ){"\n\n"}
      <span className="text-blue-400">print</span>(response.json())
    </code>
  </pre>
</div>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-xl">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Activity size={14} /> Requests_This_Cycle
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-3xl font-black">{profile?.request_count?.toLocaleString()}</span>
                <span className="text-gray-600 text-xs">/ {isPaid ? limit.toLocaleString() : '100'}</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#e8ff47] transition-all duration-1000" 
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-xl flex flex-col justify-center">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Endpoint_Health</h2>
            <div className="flex items-center gap-4">
              <Zap className="text-green-500" size={32} />
              <div>
                <p className="text-xl font-bold">99.98%</p>
                <p className="text-[10px] text-gray-600 uppercase">Avg_Latency: 42ms</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}