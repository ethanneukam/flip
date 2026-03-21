'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';

// This forces the dashboard to ignore all the server-side noise
const DashboardBase = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function fetchData() {
      try {
        const { data: apiKey } = await supabase
          .from('api_keys')
          .select('*')
          .eq('key_value', 'FLIP_DEV_TEST_123')
          .single();

        setData(apiKey);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="bg-black text-[#e8ff47] p-20 font-mono">INITIALIZING_TERMINAL...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-10 font-mono">
      <h1 className="text-[#e8ff47] text-2xl mb-4 italic font-black">FLIP_DASHBOARD_V1</h1>
      <div className="border border-[#e8ff47]/20 p-6 bg-[#0a0a0a] rounded-lg">
        <p className="text-gray-500 text-xs mb-2 tracking-widest">PRODUCTION_API_KEY</p>
        <code className="text-blue-400 bg-black p-2 block border border-white/5 mb-6">
          {data?.key_value || "NOT_FOUND"}
        </code>
        
        <p className="text-gray-500 text-xs mb-2 tracking-widest">REQUEST_VOLUME</p>
        <p className="text-4xl font-black">{data?.request_count || 0} / 10,000</p>
      </div>
    </div>
  );
};

// THIS IS THE KEY: It disables Server Side Rendering for this page
export default dynamic(() => Promise.resolve(DashboardBase), {
  ssr: false,
});