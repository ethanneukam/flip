import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search as SearchIcon, BarChart3, Shield, ArrowUpRight, Activity } from "lucide-react";
import BottomNav from "@/components/BottomNav";

export default function SearchTerminal() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const searchMarket = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      
      // Phase 6 Logic: Search the 'items' table but treat results as 'Assets'
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .or(`title.ilike.%${query}%,category.ilike.%${query}%,sku.ilike.%${query}%`)
        .limit(10);

      if (!error && data) {
        setResults(data);
      }
      setIsSearching(false);
    };

    const timer = setTimeout(searchMarket, 300); // Debounce
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-32">
      {/* Day 39 UI: The Dark Terminal Header */}
      <div className="bg-black p-6 pt-12 rounded-b-[40px] shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white text-[10px] font-black uppercase tracking-[0.3em] opacity-60">
            Terminal / Market_Query
          </h1>
          <Activity size={14} className="text-blue-500 animate-pulse" />
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter SKU, Asset Name, or Index..."
            className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="p-4 space-y-6 mt-2">
        {/* Day 38: Ranking Section */}
        {query.length > 1 && (
          <section className="space-y-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
              {isSearching ? "Querying Oracle..." : "Oracle Matches"}
            </p>
            
            {results.map((item) => (
              <div 
                key={item.id} 
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex justify-between items-center group active:scale-95 transition-all"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                    <img src={item.image_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">{item.title}</p>
                    <p className="text-[9px] font-mono text-gray-400 uppercase">
                      Asset // {item.sku || "UNRANKED_SKU"}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-black text-gray-900 font-mono">
                    ${(1200 * (item.condition_score || 1)).toLocaleString()}
                  </p>
                  <div className="flex items-center justify-end text-[8px] font-bold text-blue-500 uppercase tracking-tighter">
                    Analyze <ArrowUpRight size={10} className="ml-1" />
                  </div>
                </div>
              </div>
            ))}

            {results.length === 0 && !isSearching && (
              <div className="text-center py-10">
                <p className="text-xs font-bold text-gray-300 uppercase italic">No Global Matches Found</p>
              </div>
            )}
          </section>
        )}

        {/* Static Terminal Categories (Visible when not searching) */}
        {!query && (
          <section className="space-y-4">
            <div className="bg-blue-600 rounded-3xl p-6 text-white overflow-hidden relative shadow-xl shadow-blue-500/20">
              <BarChart3 className="absolute right-[-10px] bottom-[-10px] w-32 h-32 opacity-20 rotate-12" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Market Index</p>
              <h2 className="text-2xl font-black italic tracking-tighter mt-1">Luxury Assets</h2>
              <p className="text-xs font-bold mt-2 flex items-center">
                <span className="bg-white/20 px-2 py-0.5 rounded-lg mr-2">+4.2% Volatility</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono">
              {['Watches', 'Sneakers', 'Electronics', 'Collectibles'].map((cat) => (
                <div key={cat} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black uppercase text-gray-400">{cat}</p>
                  <p className="text-xs font-bold text-gray-900 mt-1">LIVE_FEED</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
