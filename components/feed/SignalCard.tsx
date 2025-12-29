// components/feed/SignalCard.tsx
import { TrendingUp, TrendingDown, Activity, MessageSquare } from 'lucide-react';

export default function SignalCard({ event }: { event: any }) {
  const isPositive = event.metadata.change > 0;

  return (
    <div className="bg-white border border-gray-100 rounded-[32px] p-6 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
            <Activity size={14} className="text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Oracle Signal</p>
            <p className="text-xs font-bold font-mono">{event.metadata.sku}</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-gray-300 uppercase italic">Live Sync</span>
      </div>

      <h3 className="text-xl font-black italic tracking-tighter uppercase mb-4 leading-tight">
        {event.title}
      </h3>

      <div className="flex items-end justify-between bg-gray-50 rounded-2xl p-4">
        <div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Market Value</p>
          <p className="text-2xl font-black">${event.metadata.price.toLocaleString()}</p>
        </div>
        <div className={`flex items-center font-black text-lg ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp size={20} className="mr-1" /> : <TrendingDown size={20} className="mr-1" />}
          {Math.abs(event.metadata.change)}%
        </div>
      </div>

      <button className="w-full mt-4 py-3 flex items-center justify-center space-x-2 text-gray-400 border-t border-gray-50 pt-4">
        <MessageSquare size={16} />
        <span className="text-[10px] font-black uppercase tracking-widest">Discuss Signal</span>
      </button>
    </div>
  );
}
