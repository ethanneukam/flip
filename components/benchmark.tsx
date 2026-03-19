import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Adjust path to your client
import { ShieldCheck, Activity } from 'lucide-react';

export default function RealTimeBenchmark() {
  const [stats, setStats] = useState({
    totalItems: 0,
    flipAccuracy: 0,
    googleAccuracy: 0,
    flipDelta: 0,
    googleDelta: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBenchmarkData() {
      const { data, error } = await supabase
        .from('benchmarks')
        .select('amazon_price, google_price, flip_price');

      if (data && data.length > 0) {
        let totalFlipError = 0;
        let totalGoogleError = 0;

        data.forEach(row => {
          // Calculate individual deltas vs Amazon
          totalFlipError += Math.abs(row.flip_price - row.amazon_price) / row.amazon_price;
          totalGoogleError += Math.abs(row.google_price - row.amazon_price) / row.amazon_price;
        });

        const avgFlipDelta = totalFlipError / data.length;
        const avgGoogleDelta = totalGoogleError / data.length;

        setStats({
          totalItems: data.length,
          flipAccuracy: (1 - avgFlipDelta) * 100,
          googleAccuracy: (1 - avgGoogleDelta) * 100,
          flipDelta: avgFlipDelta * 100,
          googleDelta: avgGoogleDelta * 100
        });
      }
      setLoading(false);
    }

    fetchBenchmarkData();
  }, []);

  if (loading) return <div className="animate-pulse text-[10px] text-blue-500">SYNCHRONIZING_ORACLE...</div>;

  return (
    <div className="w-full bg-[#050505] border border-white/5 p-6 rounded-lg font-mono">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-white font-black uppercase italic tracking-tighter flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-500" />
            Verification_Node_Live
          </h3>
          <p className="text-[9px] text-gray-600 uppercase tracking-widest mt-1">
            Control: Amazon Retail SKU Index
          </p>
        </div>
        <div className="text-right">
          <span className="text-[24px] font-bold text-white leading-none">{stats.totalItems}</span>
          <span className="block text-[8px] text-gray-500 uppercase font-black">Verified_Assets</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Flip Oracle Row */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase font-bold">
            <span className="text-blue-500">Flip_Oracle</span>
            <span className="text-white">{stats.flipAccuracy.toFixed(2)}% Match</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-1000" 
              style={{ width: `${stats.flipAccuracy}%` }} 
            />
          </div>
          <div className="flex justify-between text-[8px] text-gray-600 uppercase">
            <span>Avg_Price_Delta</span>
            <span>{stats.flipDelta.toFixed(3)}%</span>
          </div>
        </div>

        {/* Google Vision Row */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase font-bold">
            <span className="text-red-500">Google_Vision</span>
            <span className="text-gray-400">{stats.googleAccuracy.toFixed(2)}% Match</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-900 transition-all duration-1000" 
              style={{ width: `${stats.googleAccuracy}%` }} 
            />
          </div>
          <div className="flex justify-between text-[8px] text-gray-600 uppercase">
            <span>Avg_Price_Delta</span>
            <span>{stats.googleDelta.toFixed(3)}%</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-[8px] text-blue-500/50 uppercase font-bold">
        <Activity size={10} className="animate-pulse" />
        Cross-referencing real-time SKU data
      </div>
    </div>
  );
}