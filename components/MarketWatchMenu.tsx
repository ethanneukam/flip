import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Activity, trendingUp, ChevronRight } from "lucide-react";

export function MarketWatchMenu({ onSelect, activeId }: { onSelect: (id: string, ticker: string) => void, activeId?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllTickers = async () => {
      // Fetching all tracked items to populate the list
      const { data } = await supabase
        .from("items")
        .select("id, title, ticker, flip_price, last_updated")
        .order('title', { ascending: true });
      
      if (data) setItems(data);
      setLoading(false);
    };
    fetchAllTickers();
  }, []);

  return (
    <div className="w-full md:w-80 bg-[#0B0E11] border-r border-white/10 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-[#161A1E]/50 flex justify-between items-center">
        <h2 className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Market_Watch</h2>
        <Activity size={12} className="text-green-500 animate-pulse" />
      </div>

      {/* Ticker List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-8 text-center text-white/20 font-mono text-[10px]">SYNCING_ORACLE...</div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id, item.ticker || item.title)}
              className={`w-full p-4 border-b border-white/[0.03] flex items-center justify-between transition-all group hover:bg-white/[0.02] ${
                activeId === item.id ? 'bg-blue-600/10 border-r-2 border-r-blue-500' : ''
              }`}
            >
              <div className="text-left">
                <p className={`text-xs font-bold uppercase tracking-tight ${
                  activeId === item.id ? 'text-blue-400' : 'text-white/90'
                }`}>
                  {item.ticker || item.title.substring(0, 5).toUpperCase()}
                </p>
                <p className="text-[9px] text-white/30 truncate w-32 uppercase italic font-medium">
                  {item.title}
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-[11px] font-mono font-bold text-green-400">
                  ${item.flip_price?.toLocaleString() || '0.00'}
                </p>
                <div className="flex items-center justify-end text-[8px] text-white/20 font-black mt-0.5 uppercase tracking-tighter">
                   Live <ChevronRight size={8} className="ml-1" />
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }
      `}</style>
    </div>
  );
}