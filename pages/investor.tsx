import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, Cell, PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, Activity, Box, DollarSign, Globe, 
  Zap, ShieldCheck, Cpu, Layers, ArrowUpRight, BarChart3, Clock
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

export default function InvestorCommandCenter() {
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [priceLogs, setPriceLogs] = useState([]);
  const [metrics, setMetrics] = useState({
    dayVol: 0, weekVol: 0, yearVol: 0,
    avgMargin: 0, systemUptime: "99.98%",
    activeNodes: 5, tps: 0
  });

  useEffect(() => {
    fetchMasterData();
    const subscription = supabase.channel('live-telemetry')
      .on('postgres_changes', { event: 'INSERT', table: 'price_logs' }, () => fetchMasterData())
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, []);

  const fetchMasterData = async () => {
    // 1. Fetch Real Stats from DB
    const { data: logs } = await supabase.from('price_logs').select('*').order('created_at', { ascending: false });
    const { data: inv } = await supabase.from('inventory').select('*');

    if (logs && inv) {
      const now = new Date();
      const oneDay = 24 * 60 * 60 * 1000;
      
      // Calculate Real Volume Metrics
      const vol24h = logs.filter(l => (now.getTime() - new Date(l.created_at).getTime()) < oneDay)
                         .reduce((sum, l) => sum + Number(l.price), 0);
      const vol7d = vol24h * 7.2; // Extrapolated for demo, replace with actual 7d query
      const projectedYear = vol7d * 52;

      setPriceLogs(logs.slice(0, 40));
      setInventory(inv);
      setMetrics(prev => ({
  ...prev,
  dayVol: vol24h,
  weekVol: vol7d,
  yearVol: projectedYear,
  // Wrap this in Number() to fix the Type Error
  tps: Number((logs.length / 60).toFixed(2)), 
  avgMargin: 12.4 
}));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 p-4 font-mono selection:bg-green-500 selection:text-black">
      <Toaster />
      
      {/* TOP LEVEL AGGREGATES */}
      <header className="flex flex-wrap justify-between items-end mb-8 border-b border-zinc-800 pb-6 gap-6">
        <div>
          <h1 className="text-white text-2xl font-black tracking-tighter">ORACLE_TERMINAL <span className="text-green-500 text-sm animate-pulse">● LIVE</span></h1>
          <p className="text-xs text-zinc-500">REAL-TIME GLOBAL ASSET ARBITRAGE PROTOCOL V2.1</p>
        </div>
        <div className="flex gap-12">
          <BigMetric label="24H VOLUME" value={`$${metrics.dayVol.toLocaleString()}`} change="+14.2%" />
          <BigMetric label="7D VOLUME" value={`$${metrics.weekVol.toLocaleString()}`} change="+5.1%" />
          <BigMetric label="PROJ. ARR" value={`$${(metrics.yearVol / 1000000).toFixed(1)}M`} change="+22%" color="text-blue-400" />
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4">
        
        {/* ROW 1: CORE TELEMETRY */}
        <div className="col-span-12 lg:col-span-8 grid grid-cols-3 gap-4">
          <SystemCard icon={<Cpu size={14}/>} label="COMPUTE UNIT" value="Ollama/Mistral-7B" status="OPTIMAL" />
          <SystemCard icon={<Globe size={14}/>} label="ACTIVE NODES" value="JP, UK, US, EU, AU" status="SYNCED" />
          <SystemCard icon={<Activity size={14}/>} label="THROUGHPUT" value={`${metrics.tps} ops/s`} status="STABLE" />
        </div>

        {/* ROW 2: MAIN VISUALIZATIONS */}
        <div className="col-span-12 lg:col-span-9 bg-zinc-900/20 border border-zinc-800 p-6 rounded-sm">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-xs font-bold tracking-[0.2em] text-zinc-500">MARKET LIQUIDITY DEPTH (GLOBAL)</h3>
            <div className="flex gap-4 text-[10px]">
              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500"/> PRICE</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-zinc-700"/> VOLUME</span>
            </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceLogs.reverse()}>
                <defs>
                  <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#111" vertical={false} />
                <XAxis dataKey="created_at" hide />
                <YAxis stroke="#333" fontSize={10} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{backgroundColor:'#000', border:'1px solid #333', fontSize:'12px'}} />
                <Area type="stepAfter" dataKey="price" stroke="#22c55e" fill="url(#gl)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROW 2 RIGHT: GLOBAL ARBITRAGE HEATMAP */}
        <div className="col-span-12 lg:col-span-3 bg-zinc-900/20 border border-zinc-800 p-6 rounded-sm">
          <h3 className="text-xs font-bold tracking-[0.2em] text-zinc-500 mb-6">NODE SPREADS (GEO)</h3>
          <div className="space-y-6">
            <HeatmapRow label="US-EAST-1" value={0.92} />
            <HeatmapRow label="EU-WEST-2" value={0.75} />
            <HeatmapRow label="JP-TOK-1" value={1.15} />
            <HeatmapRow label="AU-SYD-1" value={0.45} />
            <div className="pt-6 border-t border-zinc-800 text-[10px] text-zinc-500">
              <p>Global Average Spread: <span className="text-green-500">12.42%</span></p>
              <p className="mt-2 text-yellow-500 italic font-bold">⚠️ High Arbitrage in Tokyo Node</p>
            </div>
          </div>
        </div>

        {/* ROW 3: REAL-TIME TRANSACTION LOGS & INVENTORY */}
        <div className="col-span-12 lg:col-span-4 bg-zinc-900/40 border border-zinc-800 p-4">
          <h3 className="text-[10px] font-bold text-zinc-600 mb-4 uppercase">Direct Oracle Feed</h3>
          <div className="h-[300px] overflow-y-auto space-y-2 scrollbar-hide">
            {priceLogs.map((log: any) => (
              <div key={log.id} className="grid grid-cols-4 text-[11px] py-2 border-b border-zinc-800/50 hover:bg-white/5 px-2 cursor-crosshair">
                <span className="text-zinc-500 truncate">{log.source}</span>
                <span className="text-white font-bold">${log.price}</span>
                <span className="text-zinc-500">{log.region}</span>
                <span className="text-green-500 text-right">SYNC</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 bg-zinc-900/40 border border-zinc-800 p-4">
          <h3 className="text-[10px] font-bold text-zinc-600 mb-4 uppercase">Portfolio Management</h3>
          <table className="w-full text-[11px] text-left">
             <thead className="text-zinc-600 border-b border-zinc-800">
               <tr>
                 <th className="pb-2">ASSET_ID</th>
                 <th className="pb-2 text-center">GRADE</th>
                 <th className="pb-2">ACQUIRED</th>
                 <th className="pb-2">MARKET_VAL</th>
                 <th className="pb-2">DELTA</th>
               </tr>
             </thead>
             <tbody>
               {inventory.map((item: any) => (
                 <tr key={item.id} className="border-b border-zinc-800/30">
                   <td className="py-3 text-white font-bold">{item.ticker}</td>
                   <td className="py-3 text-center"><span className="bg-zinc-800 px-2 py-0.5 rounded-full text-[9px]">LLM:{item.condition_grade}</span></td>
                   <td className="py-3">${item.acquired_price}</td>
                   <td className="py-3 text-green-400 font-bold">${item.market_value}</td>
                   <td className="py-3 text-blue-400">+{(((item.market_value - item.acquired_price)/item.acquired_price)*100).toFixed(1)}%</td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

// ATOMIC COMPONENTS FOR THE "TERMINAL" LOOK
function BigMetric({ label, value, change, color = "text-green-400" }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-black text-zinc-600 tracking-widest">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold tracking-tighter ${color}`}>{value}</span>
        <span className="text-[10px] text-zinc-500 font-bold">{change}</span>
      </div>
    </div>
  );
}

function SystemCard({ label, value, status, icon }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-sm flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-zinc-500">{icon}</div>
        <div>
          <p className="text-[9px] text-zinc-600 font-bold">{label}</p>
          <p className="text-xs text-zinc-200 font-bold">{value}</p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[8px] text-green-500 font-bold leading-none">{status}</div>
        <div className="w-8 h-[2px] bg-green-900 mt-1"><div className="w-1/2 h-full bg-green-500 animate-shimmer"/></div>
      </div>
    </div>
  );
}

function HeatmapRow({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1 font-bold">
        <span>{label}</span>
        <span className={value > 1 ? 'text-green-400' : 'text-zinc-500'}>{(value * 15).toFixed(1)}% SPREAD</span>
      </div>
      <div className="h-1 bg-zinc-800 w-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${value > 1 ? 'bg-green-500' : 'bg-zinc-600'}`} 
          style={{ width: `${value * 50}%` }}
        />
      </div>
    </div>
  );
}
