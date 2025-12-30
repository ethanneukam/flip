import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Mock data to simulate market movement (until we have real historical data)
const data = [
  { name: 'Mon', value: 24000 },
  { name: 'Tue', value: 23800 },
  { name: 'Wed', value: 24100 },
  { name: 'Thu', value: 23900 },
  { name: 'Fri', value: 24500 },
  { name: 'Sat', value: 24800 },
  { name: 'Sun', value: 24102 },
];

export default function MarketChart() {
  return (
    <div className="h-64 w-full mt-4">
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">7-Day Trend</span>
        <span className="text-[10px] font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">+1.4%</span>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#000000" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold'}} 
            dy={10}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
            itemStyle={{ color: '#000', fontWeight: 'bold', fontSize: '12px' }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#000000" 
            strokeWidth={3} 
            fillOpacity={1} 
            fill="url(#colorValue)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
