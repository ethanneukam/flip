import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { Search as SearchIcon, BarChart3, ArrowUpRight, Activity, Loader2, Plus, Check } from "lucide-react";
import BottomNav from "@/components/layout/BottomNav";

export default function SearchTerminal() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [addedIds, setAddedIds] = useState<string[]>([]);

  // 1. IMPROVED SEARCH: Checks BOTH title and ticker
  useEffect(() => {
    const searchLocal = async () => {
      if (query.length < 2) { setResults([]); return; }
      setIsSearching(true);
      
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .or(`title.ilike.%${query}%,ticker.ilike.%${query}%`) // Search name OR ticker
        .limit(10);
      
      if (data) setResults(data);
      setIsSearching(false);
    };
    const timer = setTimeout(searchLocal, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // 2. FIXED VAULT LOGIC: Use correct table columns
  const addToPortfolio = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation(); 
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("AUTH_REQUIRED: Please login.");
        return;
      }

      // We use 'items' table logic here. Ensure your schema has 'user_assets' correctly mapped.
      const { error } = await supabase.from('user_assets').insert({
        user_id: user.id,
        item_id: item.id, // Ensure this ID exists in your 'items' table
        ticker: item.ticker || "ASSET",
        name: item.title,
        current_value: item.flip_price || 0,
        image_url: item.image_url
      });

      if (error) throw error;

      setAddedIds((prev) => [...prev, item.id]);
      setTimeout(() => setAddedIds((prev) => prev.filter(id => id !== item.id)), 2000);

    } catch (err: any) {
      console.error("Vault Error:", err.message);
      alert("VAULT_FAILURE: " + err.message);
    }
  };

  const handleGlobalSearch = async (targetKeyword: string) => {
    setIsDispatching(true);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: targetKeyword })
      });
      const data = await res.json();
      router.push(`/charts?ticker=${encodeURIComponent(targetKeyword)}`);
    } catch (err) {
      console.error(err);
      setIsDispatching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-32 font-mono">
      <div className="bg-[#111] p-6 pt-12 border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center justify-between mb-4 px-2">
          <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">
            Terminal // {isDispatching ? "Scraping_Global..." : "Asset_Lookup"}
          </h1>
          <Activity size={14} className={`${isDispatching ? 'text-green-500 animate-spin' : 'text-gray-600'}`} />
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            value={query}
            onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch(query)}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Name or Ticker (e.g. BTC, iPhone)..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-gray-700 text-sm focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {query.length > 1 && (
          <section className="space-y-3">
            <div className="flex justify-between items-center px-2">
               <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
                {isSearching ? "ORACLE_SEARCHING..." : "LOCAL_REGISTRY_MATCHES"}
              </p>
            </div>
            
            {results.map((item) => (
              <div 
                key={item.id} 
                className="bg-white/5 rounded-2xl border border-white/5 p-4 flex justify-between items-center group cursor-pointer hover:border-white/20 transition-all"
              >
                <div className="flex items-center space-x-4" onClick={() => router.push(`/charts?ticker=${item.ticker || item.title}`)}>
                  <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 overflow-hidden shrink-0">
                    <img src={item.image_url || 'https://via.placeholder.com/150'} className="w-full h-full object-cover grayscale group-hover:grayscale-0" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <p className="text-xs font-black uppercase">{item.title}</p>
                       <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 rounded font-black">{item.ticker || 'N/A'}</span>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1 uppercase">Price: ${item.flip_price?.toLocaleString() || '0.00'}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => addToPortfolio(e, item)}
                    className={`p-2 rounded-xl border transition-all ${
                      addedIds.includes(item.id) 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30'
                    }`}
                  >
                    {addedIds.includes(item.id) ? <Check size={16} /> : <Plus size={16} />}
                  </button>
                  <ArrowUpRight size={14} className="text-gray-600" />
                </div>
              </div>
            ))}

            {results.length === 0 && !isSearching && (
               <button 
                onClick={() => handleGlobalSearch(query)}
                className="w-full py-10 border-2 border-dashed border-white/5 rounded-2xl text-center hover:bg-white/[0.02] transition-colors"
               >
                 <p className="text-xs font-black text-blue-500 uppercase tracking-widest">Invoke Global Scraper</p>
                 <p className="text-[9px] text-gray-600 uppercase mt-2 font-bold">New asset detected. Initialize market scan?</p>
               </button>
            )}
          </section>
        )}

        {!query && (
          <div className="py-20 text-center">
            <BarChart3 size={48} className="mx-auto text-white/5 mb-4" />
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">Awaiting_Market_Query</p>
          </div>
        )}
      </div>

      <BottomNav />
      
      {isDispatching && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center text-white">
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.4em]">Scraper_Live_In_Market</p>
          <p className="text-[9px] text-gray-500 mt-3 font-mono">BYPASSING_BOT_DETECTION // GATHERING_DATA</p>
        </div>
      )}
    </div>
  );
}
