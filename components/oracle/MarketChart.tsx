import React, { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Brush, ReferenceLine 
} from 'recharts';
import { createClient } from '@supabase/supabase-js';
import { Loader2 } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MarketChart({ itemId, ticker, data }: any) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) return;

    const fetchPriceHistory = async () => {
      setLoading(true);
      const { data: logs } = await supabase
        .from('price_logs')
        .select('price, created_at')
        .eq('item_id', itemId)
        .order('created_at', { ascending: true })
        .limit(100); // Increased limit for better scrolling

      if (logs) {
        const formatted = logs.map(log => ({
          name: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          value: log.price,
          fullDate: new Date(log.created_at).toLocaleString()
        }));
        setChartData(formatted);
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
            name: new Date(payload.new.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            value: payload.new.price,
            fullDate: new Date(payload.new.created_at).toLocaleString()
          }].slice(-100));
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [itemId]);

  const getChange = () => {
    if (chartData.length < 2) return { val: '0%', up: true };
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    const diff = ((last - first) / first) * 100;
    return { val: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`, up: diff >= 0 };
  };

  const change = getChange();
  const themeColor = change.up ? '#10b981' : '#ef4444'; // Green vs Red
// Inside your MarketChart component...

if (loading) {
  return (
    <div className="flex items-center justify-center h-64 w-full bg-[#0D0D0D] rounded-3xl border border-white/5">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );
}

if (chartData.length === 0) {
  return (
    <div className="flex flex-col items-center justify-center h-64 w-full bg-[#0D0D0D] rounded-3xl border border-white/5">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-700">Waiting for Market Data</span>
      <span className="text-[8px] text-gray-800 mt-2 italic">Oracle is currently indexing prices...</span>
    </div>
  );
}


  return (
    <div className="flex flex-col h-full w-full bg-[#0D0D0D] p-4 rounded-3xl border border-white/5 shadow-2xl">
      <div className="h-full w-full">
        <div className="flex items-end justify-between mb-6 px-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              {ticker || 'ASSET'} // LIVE TERMINAL
            </span>
            <span className="text-3xl font-bold tracking-tighter text-white">
              ${chartData.length > 0 ? chartData[chartData.length - 1].value.toLocaleString() : '---'}
            </span>
          </div>
          <div className={`flex flex-col items-end`}>
             <span className={`text-xs font-bold ${change.up ? 'text-green-500' : 'text-red-500'}`}>
               {change.val}
             </span>
             <span className="text-[8px] text-gray-600 font-bold uppercase">24H Change</span>
          </div>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={themeColor} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={themeColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff03" />
              <XAxis 
                dataKey="name" 
                hide={true} // Hide main axis to keep it clean; Brush will handle time
              />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip 
                cursor={{ stroke: themeColor, strokeWidth: 1 }}
                contentStyle={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '12px', fontSize: '10px' }}
                itemStyle={{ color: themeColor, fontWeight: 'bold' }}
              /><ReferenceLine 
  y={data?.flip_price} 
  label={{ value: 'ORACLE_VAL', fill: '#3b82f6', fontSize: 8, position: 'left' }} 
  stroke="#3b82f6" 
  strokeDasharray="3 3" 
/>
              <Area 
                type="stepAfter" // Makes it look more like a technical "tick" chart
                dataKey="value" 
                stroke={themeColor} 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorPrice)" 
                activeDot={{ r: 4, fill: themeColor, strokeWidth: 0 }}
                animationDuration={500}
              />
              {/* THE BRUSH: Adds the scrollable/clickable functionality */}
              <Brush 
                dataKey="name" 
                height={20} 
                stroke="#333" 
                fill="#000"
                travellerWidth={10}
                gap={1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <button 
        onClick={() => data?.url && window.open(data.url, '_blank')}
        className="w-full mt-6 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
      >
        Execute Purchase on {data?.source || 'MARKET'}
      </button>
    </div>
  );
}
