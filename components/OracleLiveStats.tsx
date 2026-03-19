import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Ensure this path is correct
import { ShieldCheck, Zap, Activity, Globe } from 'lucide-react';

export default function OracleLiveStats() {
  const [data, setData] = useState({
    total: 0,
    flipAccuracy: 0,
    googleAccuracy: 0,
    loading: true
  });

  useEffect(() => {
    async function getLiveMetrics() {
      // Fetch the last 50 benchmark runs
      const { data: logs, error } = await supabase
        .from('benchmarks')
        .select('amazon_price, google_price, flip_price')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logs && logs.length > 0) {
        let flipErrorTotal = 0;
        let googleErrorTotal = 0;

        logs.forEach(row => {
          // Accuracy = 1 - (Absolute Error / Control Price)
          flipErrorTotal += Math.abs(row.flip_price - row.amazon_price) / row.amazon_price;
          googleErrorTotal += Math.abs(row.google_price - row.amazon_price) / row.amazon_price;
        });

        const flipAcc = (1 - (flipErrorTotal / logs.length)) * 100;
        const googleAcc = (1 - (googleErrorTotal / logs.length)) * 100;

        setData({
          total: logs.length,
          flipAccuracy: flipAcc,
          googleAccuracy: googleAcc,
          loading: false
        });
      }
    }

    getLiveMetrics();
  }, []);

  if (data.loading) return <div className="text-[10px] font-mono text-blue-500 animate-pulse">CONNECTING_TO_ORACLE_NODE...</div>;

  return (
    <div className="w-full max-w-sm bg-black/40 border border-white/10 backdrop-blur-md rounded-xl p-5 font-mono shadow-2xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h4 className="text-white text-xs font-bold tracking-tighter flex items-center gap-2 uppercase">
            <ShieldCheck size={14} className="text-blue-400" />
            Verification Engine
          </h4>
          <p className="text-[9px] text-gray-500 mt-1 uppercase tracking-widest">Control: Amazon SKU Index</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[9px] text-green-500 font-bold uppercase">Live</span>
        </div>
      </div>

      <div className="space-y-5">
        {/* Flip Performance */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-end">
            <span className="text-[10px] text-blue-400 font-black uppercase">Flip_Oracle_Node</span>
            <span className="text-lg text-white font-bold leading-none">{data.flipAccuracy.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6] transition-all duration-1000" 
              style={{ width: `${data.flipAccuracy}%` }}
            />
          </div>
        </div>

        {/* Google Performance */}
        <div className="space-y-1.5 opacity-60">
          <div className="flex justify-between items-end">
            <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Google_Vision_Index</span>
            <span className="text-sm text-gray-300 font-bold leading-none">{data.googleAccuracy.toFixed(1)}%</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-900 transition-all duration-1000" 
              style={{ width: `${data.googleAccuracy}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[8px] text-gray-600 uppercase font-bold tracking-widest">
        <div className="flex items-center gap-1">
          <Activity size={10} />
          {data.total} Assets Scanned
        </div>
        <div className="flex items-center gap-1">
          <Globe size={10} />
          Global Consensus
        </div>
      </div>
    </div>
  );
}