import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Activity, TrendingUp, ChevronRight, Zap } from "lucide-react";

export function MarketWatchMenu({ onSelect, activeId }: { onSelect: (id: string, ticker: string) => void, activeId?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    const fetchAllTickers = async () => {
      // 1. Get the current user
      const { data: { user } } = await supabase.auth.getUser();

      // 2. Fetch all items
      const { data: itemsData } = await supabase
        .from("items")
        .select("id, title, ticker, flip_price, last_updated")
        .order('title', { ascending: true });
      
      // 3. Fetch user's watchlist if logged in
      if (user) {
        const { data: watchData } = await supabase
          .from("user_watchlist")
          .select("item_id")
          .eq("user_id", user.id);
        
        if (watchData) setWatchlist(watchData.map(w => w.item_id));
      }

      if (itemsData) setItems(itemsData);
      setLoading(false);
    };
    fetchAllTickers();
  }, []);

  const togglePin = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation(); // Prevents the onSelect from triggering when clicking pin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isPinned = watchlist.includes(itemId);

    try {
      const res = await fetch('/api/watchlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, itemId }),
      });
      const data = await res.json();

      if (data.status === 'added') {
        setWatchlist(prev => [...prev, itemId]);
      } else {
        setWatchlist(prev => prev.filter(id => id !== itemId));
      }
    } catch (error) {
      console.error("Pin toggle failed", error);
    }
  };

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
              <div className="flex items-center gap-3 text-left">
                {/* PIN ICON */}
                <Zap 
                  size={14} 
                  onClick={(e) => togglePin(e, item.id)}
                  className={`transition-colors cursor-pointer ${
                    watchlist.includes(item.id) 
                      ? 'text-amber-500 fill-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' 
                      : 'text-white/10 hover:text-white/40'
                  }`}
                />
                
                <div>
                  <p className={`text-xs font-bold uppercase tracking-tight ${
                    activeId === item.id ? 'text-blue-400' : 'text-white/90'
                  }`}>
                    {item.ticker || item.title.substring(0, 5).toUpperCase()}
                  </p>
                  <p className="text-[9px] text-white/30 truncate w-24 uppercase italic font-medium">
                    {item.title}
                  </p>
                </div>
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
