import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart 
} from 'recharts';
import { 
  TrendingUp, Activity, Box, DollarSign, Globe, 
  Zap, ShieldCheck, AlertTriangle, Search 
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

export default function CommandCenter() {
  const [stats, setStats] = useState({ totalValue: 0, cash: 10000, activeScans: 0 });
  const [inventory, setInventory] = useState([]);
  const [marketFeed, setMarketFeed] = useState([]);

  // 1. DATA AGGREGATION LOGIC
  useEffect(() => {
    const fetchGlobalIntelligence = async () => {
      // Fetch Inventory Value
      const { data: inv } = await supabase.from('inventory').select('*').eq('status', 'held');
      const total = inv?.reduce((acc, curr) => acc + Number(curr.market_value), 0) || 0;
      
      // Fetch Recent Oracle Scans (Volume)
      const { data: scans } = await supabase.from('price_logs').select('*').limit(50).order('created_at', { ascending: false });
      
      setInventory(inv || []);
      setMarketFeed(scans || []);
      setStats(prev => ({ ...prev, totalValue: total, activeScans: scans?.length || 0 }));
    };

    fetchGlobalIntelligence();
    // Realtime subscription to the "Pulse"
    const channel = supabase.channel('oracle-updates')
      .on('postgres_changes', { event: 'INSERT', table: 'price_logs' }, (payload) => {
        setMarketFeed(prev => [payload.new, ...prev].slice(0, 50));
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-4 font-mono">
      <Toaster />
      
      {/* HEADER: TELEMETRY BAR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Portfolio Value" value={`$${stats.totalValue.toLocaleString()}`} icon={<Box className="text-blue-500" />} />
        <StatCard title="Buying Power" value={`$${stats.cash.toLocaleString()}`} icon={<DollarSign className="text-green-500" />} />
        <StatCard title="System Throughput" value={`${stats.activeScans} TPS`} icon={<Activity className="text-purple-500" />} />
        <StatCard title="Global Nodes" value="5 Active" icon={<Globe className="text-cyan-500" />} />
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* LEFT: LIVE ARBITRAGE RADAR */}
        <div className="col-span-12 lg:col-span-8 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Zap className="text-yellow-400" size={20} /> MARKET LIQUIDITY & VOLUME
            </h2>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={marketFeed.map((f, i) => ({ name: i, price: f.price, volume: Math.random() * 100 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" hide />
                <YAxis yAxisId="left" stroke="#888" />
                <YAxis yAxisId="right" orientation="right" stroke="#444" />
                <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                <Area yAxisId="left" type="monotone" dataKey="price" stroke="#00ff00" fill="#00ff0022" />
                <Bar yAxisId="right" dataKey="volume" fill="#333" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT: THE PULSE (LIVE FEED) */}
        <div className="col-span-12 lg:col-span-4 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 overflow-hidden">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-500" /> REAL-TIME PULSE
          </h2>
          <div className="space-y-4 h-[400px] overflow-y-auto pr-2 scrollbar-hide">
            {marketFeed.map((event: any) => (
              <div key={event.id} className="border-l-2 border-green-900 pl-4 py-1 animate-pulse">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>{event.source}</span>
                  <span>{new Date(event.created_at).toLocaleTimeString()}</span>
                </div>
                <div className="text-sm font-medium italic">Scanned Asset #{event.item_id.slice(0, 5)}</div>
                <div className="text-green-400 font-bold">${event.price} <span className="text-[10px] text-zinc-600">USD</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM: ASSET VAULT (INVENTORY) */}
        <div className="col-span-12 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Digital Asset Vault</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="pb-3">Asset Ticker</th>
                  <th className="pb-3">Grade</th>
                  <th className="pb-3">Acquisition</th>
                  <th className="pb-3">Current Market</th>
                  <th className="pb-3">Spread (%)</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {inventory.map((item: any) => (
                  <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-4 font-bold text-blue-400">{item.ticker}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-[10px] ${item.condition_grade === 'A' ? 'bg-green-900 text-green-300' : 'bg-zinc-700'}`}>
                        GRADE {item.condition_grade}
                      </span>
                    </td>
                    <td className="py-4">${item.acquired_price}</td>
                    <td className="py-4 text-green-400 font-bold">${item.market_value}</td>
                    <td className="py-4 text-zinc-400">
                      {(((item.market_value - item.acquired_price) / item.acquired_price) * 100).toFixed(2)}%
                    </td>
                    <td className="py-4 text-right">
                      <button className="bg-white text-black px-4 py-1 text-xs font-bold rounded hover:bg-green-400 transition-colors">
                        LIQUIDATE
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </div>
      <div className="p-3 bg-zinc-800 rounded-lg">{icon}</div>
    </div>
  );
}
