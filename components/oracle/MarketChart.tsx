import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MarketChartProps {
  itemId: string; 
  ticker?: string;
  data?: {
    source_url?: string; // Standardized to source_url
    source?: string;
  };
}

export default function MarketChart({ itemId, ticker, data }: MarketChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) return; // Prevent fetching if ID is null

    const fetchPriceHistory = async () => {
      setLoading(true);
      // Query the CORRECT table: market_data
      const { data: logs, error } = await supabase
        .from('market_data') 
        .select('price, created_at')
        .eq('item_id', itemId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (logs && logs.length > 0) {
        const formatted = logs.map(log => ({
          name: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          value: log.price,
          fullDate: new Date(log.created_at).toLocaleString()
        }));
        setChartData(formatted);
      } else {
        // Fallback if no history exists yet (show flat line at current price?)
        setChartData([]);
      }
      setLoading(false);
    };

    fetchPriceHistory();

    // Realtime Listener on market_data
    const channel = supabase
      .channel(`market-update-${itemId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'market_data', 
          filter: `item_id=eq.${itemId}` 
        }, 
        (payload) => {
          const newPoint = {
            name: new Date(payload.new.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            value: payload.new.price,
            fullDate: new Date(payload.new.created_at).toLocaleString()
          };
          setChartData((prev) => [...prev, newPoint].slice(-50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId]);

  // Calculate change
  const getChange = () => {
    if (chartData.length < 2) return { val: '0.0%', up: true };
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    // Avoid division by zero
    if (first === 0) return { val: '0.0%', up: true };
    
    const diff = ((last - first) / first) * 100;
    return { 
      val: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`, 
      up: diff >= 0 
    };
  };

  const change = getChange();
  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;

  return (
    <div className="flex flex-col h-full w-full bg-black/20 p-4 rounded-2xl border border-white/5">
      <div className="h-full w-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              {ticker || 'ASSET'} PRICE TREND
            </span>
            <span className="text-xl font-bold text-white">
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${change.up ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
            {change.val}
          </span>
        </div>
        
        <div className="flex-1 min-h-0 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={change.up ? "#22c55e" : "#ef4444"} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={change.up ? "#22c55e" : "#ef4444"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
              <XAxis dataKey="name" hide />
              <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #333', borderRadius: '8px' }}
                itemStyle={{ color: '#fff', fontSize: '12px' }}
                labelStyle={{ display: 'none' }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={change.up ? "#22c55e" : "#ef4444"} 
                strokeWidth={2} 
                fill="url(#colorValue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <button 
        onClick={() => data?.source_url && window.open(data.source_url, '_blank')}
        disabled={!data?.source_url}
        className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-white"
      >
        {data?.source_url ? `View on ${data.source || 'Market'}` : 'No Source Link'}
      </button>
    </div>
  );
}
