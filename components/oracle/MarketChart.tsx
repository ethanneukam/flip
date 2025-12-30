import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Define the Props interface to satisfy TypeScript
interface MarketChartProps {
  ticker?: string; // Optional for now so it doesn't break existing views
}

// Mock data (we will replace this with data from your scrapers)
const mockData = [
  { name: 'Mon', value: 24000 },
  { name: 'Tue', value: 23800 },
  { name: 'Wed', value: 24100 },
  { name: 'Thu', value: 23900 },
  { name: 'Fri', value: 24500 },
  { name: 'Sat', value: 24800 },
  { name: 'Sun', value: 24102 },
];

export default function MarketChart({ ticker }: MarketChartProps) {
  const [chartData, setChartData] = useState(mockData);

  useEffect(() => {
    if (ticker) {
      console.log(`Initializing stream for: ${ticker}`);
      // TODO: Fetch historical price points from Supabase market_history table
      // fetchHistory(ticker).then(data => setChartData(data));
    }
  }, [ticker]);

  return (
    <div className="h-full w-full">
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          {ticker ? `${ticker} TREND` : '7-Day Trend'}
        </span>
        <span className="text-[10px] font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">+1.4%</span>
      </div>
      
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="name" 
            hide={false}
            axisLine={false} 
            tickLine={false} 
            tick={{fontSize: 9, fill: '#9CA3AF', fontWeight: 'bold'}} 
          />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '10px' }}
            itemStyle={{ color: '#000', fontWeight: 'bold' }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#3b82f6" 
            strokeWidth={2} 
            fillOpacity={1} 
            fill="url(#colorValue)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    <button 
  onClick={() => window.open(data?.url, '_blank')}
  className="w-full mt-4 py-3 bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all"
>
  View Original Listing // {data?.source}
</button>
  );
}
