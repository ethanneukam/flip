import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MarketChartProps {
  itemId: string; // We use itemId to fetch the logs
  ticker?: string;
  data?: {
    url?: string;
    source?: string;
  };
}

export default function MarketChart({ itemId, ticker, data }: MarketChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) return;

    // 1. Initial Fetch of Price History
    const fetchPriceHistory = async () => {
      setLoading(true);
      const { data: logs, error } = await supabase
        .from('price_logs')
        .select('price, created_at')
        .eq('item_id', itemId)
        .order('created_at', { ascending: true })
        .limit(50); // Keep graph clean

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

    // 2. Realtime Update: Listen for new price logs for THIS item
  const channel = supabase
  .channel(`price-changes-${itemId}`)
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'price_logs', filter: `item_id=eq.${itemId}` }, 
    (payload) => {
          const newPoint = {
            name: new Date(payload.new.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            value: payload.new.price,
            fullDate: new Date(payload.new.created_at).toLocaleString()
          };
          setChartData((prev) => [...prev, newPoint].slice(-50)); // Keep only last 50 points
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId]);

  // Calculate percentage change based on first and last data points
  const getChange = () => {
    if (chartData.length < 2) return { val: '0%', up: true };
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    const diff = ((last - first) / first) * 100;
    return { 
      val: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`, 
      up: diff >= 0 
    };
  };

  const change = getChange();

  return (
    <div className="flex flex-col h-full w-full bg-black/20 p-4 rounded-2xl border border-white/5">
      {/* Chart Section */}
      <div className="h-full w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              {ticker || 'MARKET'} PRICE TREND
            </span>
          <span className="text-xl font-bold text-white">
  {chartData.length > 0 
    ? `$${chartData[chartData.length - 1].value.toLocaleString()}` 
    : `$${data?.flip_price?.toLocaleString() || '---'}`} 
</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${change.up ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
            {change.val}
          </span>
        </div>
        
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 8, fill: '#4B5563'}} 
                minTickGap={20}
              />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px', fontSize: '10px' }}
                itemStyle={{ color: '#3b82f6' }}
                labelStyle={{ color: '#666' }}
                labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorValue)" 
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Action Button */}
      <button 
        onClick={() => data?.url && window.open(data.url, '_blank')}
        className="w-full mt-4 py-3 bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 active:scale-[0.98] transition-all text-white shadow-lg shadow-blue-600/20"
      >
        View Live Listing on {data?.source || 'MARKET'}
      </button>
    </div>
  );
}
