// components/feed/FeedItem.tsx
import { Zap, Shield, TrendingUp, TrendingDown, Box } from 'lucide-react';

export default function FeedItem({ event }: { event: any }) {
  const isOracle = event.type === 'ORACLE_SIGNAL';
  
  return (
    <div className="bg-white border-b border-gray-50 p-6 last:border-0">
      {/* Event Header */}
      <div className="flex items-center space-x-2 mb-4">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isOracle ? 'bg-black' : 'bg-blue-600'}`}>
          {isOracle ? <Zap size={12} className="text-yellow-400" /> : <Box size={12} className="text-white" />}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          {isOracle ? 'Oracle Alert' : 'Vault Entry'}
        </span>
      </div>

      {/* Main Content */}
      <div className="flex gap-4">
        {/* If it's a user post, show the item image */}
        {!isOracle && event.metadata.image_url && (
          <div className="w-20 h-20 bg-gray-50 rounded-2xl overflow-hidden shrink-0 border border-gray-100">
            <img src={event.metadata.image_url} className="w-full h-full object-cover" alt="" />
          </div>
        )}

        <div className="flex-1">
          <h3 className="text-lg font-black italic tracking-tighter leading-tight uppercase">
            {isOracle ? event.title : `User @${event.profiles?.username} ${event.description}`}
          </h3>
          
          {isOracle && (
            <div className="mt-3 flex items-center space-x-3">
              <div className="bg-gray-900 text-white px-3 py-2 rounded-xl flex items-baseline space-x-2">
                <span className="text-xs font-bold font-mono">${event.metadata.price}</span>
                <span className={`text-[10px] font-black ${event.metadata.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {event.metadata.change > 0 ? '+' : ''}{event.metadata.change}%
                </span>
              </div>
              <span className="text-[10px] font-bold text-gray-300 uppercase font-mono">{event.metadata.sku}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Proof Tag */}
      <div className="mt-4 flex items-center space-x-1 opacity-40">
        <Shield size={10} />
        <span className="text-[9px] font-bold uppercase tracking-widest">Verified Signal</span>
      </div>
    </div>
  );
}
