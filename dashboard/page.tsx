'use client';
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize inside the component or check for window to avoid SSR issues
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StableDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mount, setMount] = useState(false);

  // Fix for Error #310: Ensure we only render content on the client
  useEffect(() => {
    setMount(true);
    
    async function fetchData() {
      try {
        const { data: apiKey, error } = await supabase
          .from('api_keys')
          .select('*')
          .eq('key_value', 'FLIP_DEV_TEST_123')
          .single();

        if (error) console.error("Supabase Error:", error.message);
        if (apiKey) setData(apiKey);
      } catch (err) {
        console.error("Critical Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (!mount) return null; 

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono text-[#e8ff47]">
        [ LOADING_SYSTEM_DATA... ]
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono p-10">
      <div className="max-w-2xl mx-auto border border-white/10 p-8 rounded-lg bg-[#0a0a0a]">
        <h1 className="text-xl font-bold mb-6 border-b border-white/10 pb-4 text-[#e8ff47]">
          TERMINAL // DASHBOARD_V1
        </h1>
        
        <div className="space-y-4">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-widest">Active_Key</p>
            <code className="text-blue-400 block bg-black p-3 rounded mt-1 border border-white/5">
              {data?.key_value || "NO_KEY_FOUND"}
            </code>
          </div>

          <div className="pt-4">
            <p className="text-gray-500 text-xs uppercase tracking-widest">Request_Usage</p>
            <p className="text-3xl font-black mt-1">
              {data?.request_count || 0} <span className="text-sm text-gray-600">/ 10,000</span>
            </p>
          </div>
          
          <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
             <div 
               className="bg-[#e8ff47] h-full transition-all duration-500" 
               style={{ width: `${((data?.request_count || 0) / 10000) * 100}%` }}
             />
          </div>
        </div>
      </div>
    </div>
  );
}