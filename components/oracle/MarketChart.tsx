import React, { useEffect, useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { createClient } from '@supabase/supabase-js';
import { Loader2 } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Range = '1H' | '24H' | '7D' | 'ALL';

export default function MarketChart({ itemId, ticker }: any) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('24H');

  useEffect(() => {
    if (!itemId) return;

    const fetchPriceHistory = async () => {
      setLoading(true);
      
      // Calculate start time based on range
      const now = new Date();
      let startTime = new Date();
      if (range === '1H') startTime.setHours(now.getHours() - 1);
      else if (range === '24H') startTime.setHours(now.getHours() - 24);
      else if (range === '7D') startTime.setDate(now.getDate() - 7);
      else startTime.setFullYear(2000); // ALL

      const { data: logs } = await supabase
        .from('price_logs')
        .select('price, created_at')
        .eq('item_id', itemId)
        .gte('created_at', startTime.toISOString())
        .order('created_at', { ascending: true });

      if (logs) {
        setChartData(logs.map(log => ({
          timestamp: new Date(log.created_at).getTime(),
          value: log.price,
        })));
      }
      setLoading(false);
    };

    fetchPriceHistory();

    const channel = supabase
      .channel(`price-changes-${itemId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'price_logs', filter: `item_id=eq.${itemId}` }, 
        (payload) => {
          setChartData((prev) => [...prev, {
            timestamp: new Date(payload.new.created_at).getTime(),
            value: payload.new.price,
          }]);
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [itemId, range]); // Re-fetch when range changes

  const formatXAxis = (tickItem: number) => {
    const date = new Date(tickItem);
    if (range === '7D' || range === 'ALL') {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const change = useMemo(() => {
    if (chartData.length < 2) return { val: '0%', up: true };
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    const diff = ((last - first) / first) * 100;
    return { val: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`, up: diff >= 0 };
  }, [chartData]);

  const themeColor = change.up ? '#10b981' : '#ef4444';

  return (
    <div className="flex flex-col h-full w-full bg-[#080808] p-6 rounded-xl border border-white/5 font-mono">
      <div className="flex items-start justify-between mb-8">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-1">
            {ticker || 'TERMINAL'} // MARKET_DATA
          </span>
          <span className="text-4xl font-bold tracking-tighter text-white">
            ${chartData.length > 0 ? chartData[chartData.length - 1].value.toLocaleString() : '---'}
          </span>
          <div className="flex items-center gap-2 mt-1">
             <span className={`text-xs font-black ${change.up ? 'text-green-500' : 'text-red-500'}`}>
                {change.val}
             </span>
             <span className="text-[8px] text-gray-700 uppercase tracking-widest font-bold font-mono">24H_DELTA</span>
          </div>
        </div>

        {/* TIME RANGE SELECTOR */}
        <div className="flex bg-white/5 p-1 rounded-sm border border-white/5">
          {(['1H', '24H', '7D', 'ALL'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-[9px] font-black transition-all ${
                range === r 
                  ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
            <Loader2 className="animate-spin text-blue-500/50" size={24} />
          </div>
        )}
        
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={themeColor} stopOpacity={0.15}/>
                <stop offset="95%" stopColor={themeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 2" vertical={true} stroke="#ffffff03" />
            <XAxis 
              dataKey="timestamp" 
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatXAxis}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#ffffff', fillOpacity: 0.1, fontSize: 8 }}
              minTickGap={50}
            />
            <YAxis 
              orientation="right"
              domain={['auto', 'auto']}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#333', fontSize: 9 }}
              tickFormatter={(val) => `$${val.toLocaleString()}`}
            />
            <Tooltip 
              cursor={{ stroke: '#ffffff10', strokeWidth: 1 }}
              contentStyle={{ backgroundColor: '#000', border: '1px solid #111', color: '#fff', fontSize: '10px' }}
              labelFormatter={(label) => new Date(label).toLocaleString()}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={themeColor} 
              strokeWidth={1.5} 
              fillOpacity={1} 
              fill="url(#colorPrice)" 
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}