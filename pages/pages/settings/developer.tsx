import { useState, useEffect } from 'react';
import { supabase } from 'lib/supabaseClient';
import { Key, Copy, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';

export default function DeveloperSettings() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Inside your DeveloperSettings component
const generateKey = async () => {
  setLoading(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const res = await fetch('/api/keys/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: user?.id,
        keyName: "Production_Main" 
      })
    });

    const data = await res.json();
    if (data.apiKey) {
      setApiKey(data.apiKey); // Show the raw key once
    }
  } catch (err) {
    alert("Key Generation Failed");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8 font-mono">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-black italic mb-2 tracking-tighter">DEV_PORTAL</h1>
        <p className="text-gray-500 text-sm mb-8 uppercase tracking-widest">Enterprise API Access & Documentation</p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Key size={20} className="text-blue-500" />
            </div>
            <h2 className="text-sm font-black uppercase">Production_API_Key</h2>
          </div>

          {apiKey ? (
            <div className="space-y-4">
              <div className="bg-black border border-blue-500/50 p-4 rounded-xl flex justify-between items-center group">
                <code className="text-blue-400 text-xs">{apiKey}</code>
                <button 
                  onClick={() => navigator.clipboard.writeText(apiKey)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Copy size={14} />
                </button>
              </div>
              <p className="text-[10px] text-yellow-500 font-bold uppercase flex items-center gap-2">
                <ShieldAlert size={12} /> Warning: This key will only be shown once.
              </p>
            </div>
          ) : (
            <button 
              onClick={generateKey}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all"
            >
              {loading ? 'Generating...' : 'Generate_New_API_Key'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <p className="text-[9px] text-gray-500 uppercase font-black mb-1">Monthly_Requests</p>
            <p className="text-2xl font-black italic">0 / 5,000</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <p className="text-[9px] text-gray-500 uppercase font-black mb-1">API_Status</p>
            <p className="text-2xl font-black italic text-green-500">ACTIVE</p>
          </div>
        </div>
      </div>
    </div>
  );
}