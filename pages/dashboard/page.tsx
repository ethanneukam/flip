'use client';
import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Terminal, Key, Activity, Copy, Check, Zap,
  AlertCircle, FileSpreadsheet, Share2, Rocket, X, Code2,
  BookOpen
} from 'lucide-react';


export default function DeveloperDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [apiKey, setApiKey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showSheetModal, setShowSheetModal] = useState(false);
 
  const supabase = createClientComponentClient();


  // Replace this with your actual API domain when ready
  const API_URL = "https://flip-black-two.vercel.app/api/v1/price";


useEffect(() => {
  async function loadDevData() {
    try {
      // 1. Get the session without forcing a redirect
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (user) {
        // 2. Use .maybeSingle() so it doesn't crash if the user is new/has no key
        const [pRes, kRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          supabase.from('api_keys').select('*').eq('user_id', user.id).maybeSingle()
        ]);

        setProfile(pRes.data);
        setApiKey(kRes.data);
      }
    } catch (error) {
      console.error("Vault Error:", error);
    } finally {
      // 3. ALWAYS set loading to false so the page actually renders
      setLoading(false);
    }
  }
  loadDevData();
}, [supabase]);


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono text-[#e8ff47]">
      <div className="animate-pulse mb-4">› INITIALIZING_SECURE_VAULT...</div>
      <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-[#e8ff47] animate-progress-loading"></div>
      </div>
    </div>
  );


  const limit = profile?.tier === 'Starter' ? 10000 : profile?.tier === 'Growth' ? 50000 : 150000;
  const usagePercent = Math.min(((profile?.request_count || 0) / limit) * 100, 100);


  // The code for the Google Apps Script
  const googleScript = `function FETCH_CARD_VALUE(cardName) {
  const apiKey = "${apiKey?.key_value || 'YOUR_API_KEY'}";
  const options = {
    'headers': { 'X-API-KEY': apiKey },
    'muteHttpExceptions': true
  };
 
  try {
    const response = UrlFetchApp.fetch("${API_URL}/v1/price/" + encodeURIComponent(cardName), options);
    const data = JSON.parse(response.getContentText());
    return data.market_price || "Not Found";
  } catch (e) {
    return "Error: " + e.message;
  }
}`;


  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
       
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#e8ff47] rounded-lg">
                <Terminal className="text-black" size={24} />
              </div>
              <h1 className="text-2xl font-black tracking-tighter italic">TERMINAL_VAULT_v1.0</h1>
            </div>
            <p className="text-gray-500 text-[10px] mt-2 uppercase tracking-[0.3em]">
              Operator: <span className="text-white">{profile?.email || 'Authenticated_User'}</span>
            </p>
          </div>
         <div className="flex flex-col items-end gap-3">
             <div className="text-right">
               <span className="text-[10px] text-gray-500 block uppercase mb-1">Current_Plan</span>
               <span className="px-3 py-1 bg-[#e8ff47]/10 border border-[#e8ff47]/20 text-[#e8ff47] text-xs font-bold rounded-full">
                 {profile?.tier?.toUpperCase() || 'SANDBOX'}
               </span>
             </div>
             
             {/* NEW API DOCS BUTTON */}
             <a
               href="/docs"
               className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all text-white/80 hover:text-white"
             >
               <BookOpen size={14} />
               <span className="text-[10px] font-bold uppercase tracking-widest">Read API Docs</span>
             </a>
          </div>
        </div>
        {/* --- SUCCESS KIT (THE SHOP OWNER SECTION) --- */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <Rocket size={14} className="text-[#e8ff47]" /> Success_Kit_Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           
            {/* Google Sheets Trigger */}
            <button
              onClick={() => setShowSheetModal(true)}
              className="flex items-center gap-4 bg-[#0a0a0a] border border-white/10 p-5 rounded-xl hover:border-green-500/50 transition-all text-left group"
            >
              <div className="p-3 bg-green-500/10 rounded-lg group-hover:bg-green-500/20">
                <FileSpreadsheet className="text-green-500" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase">Google Sheets</p>
                <p className="text-[10px] text-gray-500 mt-1">Get the price-sync script.</p>
              </div>
            </button>


            {/* Shopify / Zapier */}
            <button
              onClick={() => window.open('https://zapier.com/apps/shopify/integrations', '_blank')}
              className="flex items-center gap-4 bg-[#0a0a0a] border border-white/10 p-5 rounded-xl hover:border-blue-500/50 transition-all text-left group"
            >
              <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20">
                <Share2 className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase">Shopify / eBay</p>
                <p className="text-[10px] text-gray-500 mt-1">Connect via Zapier Bridge.</p>
              </div>
            </button>


            {/* White Glove Email */}
            <a
              href={`mailto:support@flip-terminal.com?subject=White Glove Setup Request&body=Hi, I am on the ${profile?.tier} tier and would like help setting up my custom inventory sync.`}
              className="flex items-center gap-4 bg-[#e8ff47] p-5 rounded-xl hover:scale-[1.02] transition-all text-black group"
            >
              <div className="p-3 bg-black/10 rounded-lg">
                <Zap className="text-black fill-black" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase italic tracking-tighter">White Glove Setup</p>
                <p className="text-[10px] font-bold opacity-70">We build it for you.</p>
              </div>
            </a>
          </div>
        </section>


        {/* --- API KEY & USAGE --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
          {/* Key Card */}
          <div className="lg:col-span-2 bg-[#0a0a0a] border border-white/10 p-8 rounded-2xl relative overflow-hidden">
             <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Master_Access_Key</h2>
             <div className="flex items-center gap-3 bg-black border border-white/5 p-4 rounded-lg relative z-10">
                <code className="text-[#e8ff47] text-lg font-bold tracking-wider">
                  {apiKey?.key_value || 'GENERATING_KEY...'}
                </code>
                <button
                  onClick={() => copyToClipboard(apiKey?.key_value)}
                  className="ml-auto p-2 hover:bg-white/5 rounded transition-colors text-gray-500"
                >
                  {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                </button>
             </div>
             
             {/* Large background icon */}
             <Key className="absolute -bottom-4 -right-4 text-white/[0.02]" size={140} />
          </div>


          {/* Usage Stats Card */}
          <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-2xl flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Quota_Usage</h2>
              <p className="text-3xl font-black italic">{profile?.request_count?.toLocaleString() || 0}</p>
              <p className="text-[10px] text-gray-600 uppercase tracking-tighter">Requests used this cycle</p>
            </div>
           
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                <span className="text-gray-500">Tier_Limit</span>
                <span className="text-[#e8ff47]">{limit.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-[#e8ff47] shadow-[0_0_10px_#e8ff47] transition-all duration-1000"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>


        {/* --- PYTHON SNIPPET --- */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-white/5 px-6 py-3 border-b border-white/10 flex justify-between items-center">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
              <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/40" />
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/40" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Code2 size={12} /> fetch_market_prices.py
            </span>
          </div>
          <div className="p-8 font-mono text-sm leading-relaxed overflow-x-auto">
            <pre className="text-gray-400">
              <code>
                <span className="text-purple-400">import</span> requests{"\n\n"}
                headers = {"{"}{"\n"}
                {"  "}<span className="text-green-400">"X-API-KEY"</span>: <span className="text-[#e8ff47]">"{apiKey?.key_value || 'YOUR_KEY_HERE'}"</span>{"\n"}
                {"}"}{"\n\n"}
                <span className="text-gray-600"># Fetch price for a specific trading card</span>{"\n"}
                res = requests.get(<span className="text-green-400">"{API_URL}/v1/price/Charizard-Base-Set"</span>, headers=headers){"\n"}
                data = res.json(){"\n\n"}
                <span className="text-blue-400">print</span>(<span className="text-green-400">f"Market Price: "</span>, data[<span className="text-green-400">'price'</span>])
              </code>
            </pre>
          </div>
        </div>


      </div>


      {/* --- GOOGLE SHEETS SCRIPT MODAL --- */}
      {showSheetModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d0d0d] border border-white/10 max-w-2xl w-full rounded-3xl shadow-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black italic flex items-center gap-2">
                  <FileSpreadsheet className="text-green-500" /> GOOGLE_SHEETS_SCRIPT
                </h3>
                <p className="text-[10px] text-gray-500 uppercase mt-1">Version 1.0.4 | Optimized for TCG Shops</p>
              </div>
              <button
                onClick={() => setShowSheetModal(false)}
                className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
           
            <div className="p-8 space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-bold flex items-center gap-2 text-[#e8ff47]">
                  <Check size={16} /> 1. Open Google Sheets
                </p>
                <p className="text-sm font-bold flex items-center gap-2 text-[#e8ff47]">
                  <Check size={16} /> 2. Extensions › Apps Script
                </p>
                <p className="text-sm font-bold flex items-center gap-2 text-[#e8ff47]">
                  <Check size={16} /> 3. Paste the code below:
                </p>
              </div>


              <div className="relative group">
                <pre className="bg-black p-6 rounded-xl text-[11px] text-green-500 border border-white/5 overflow-y-auto max-h-48 font-mono leading-normal">
                  {googleScript}
                </pre>
                <button
                  onClick={() => copyToClipboard(googleScript)}
                  className="absolute top-4 right-4 bg-[#e8ff47] text-black px-3 py-1 text-[10px] font-bold rounded hover:bg-white transition-colors"
                >
                  {copied ? 'COPIED' : 'COPY_SCRIPT'}
                </button>
              </div>


              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Usage in Sheet:</p>
                <code className="text-sm text-[#e8ff47]">=FETCH_CARD_VALUE("Charizard Base Set")</code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
