import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { Search as SearchIcon, BarChart3, ArrowUpRight, Activity, Loader2, Plus, Check } from "lucide-react";
import BottomNav from "@/components/BottomNav";

export default function SearchTerminal() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [addedIds, setAddedIds] = useState<string[]>([]); // Track added items for UI feedback

  // Live Local Search
  useEffect(() => {
    const searchLocal = async () => {
      if (query.length < 2) { setResults([]); return; }
      setIsSearching(true);
      const { data } = await supabase
        .from("items")
        .select("*")
        .ilike("title", `%${query}%`)
        .limit(6);
      if (data) setResults(data);
      setIsSearching(false);
    };
    const timer = setTimeout(searchLocal, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // ADD TO PORTFOLIO LOGIC
  const addToPortfolio = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation(); // Prevents the parent div's onClick from firing
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please log in to build your vault.");
        return;
      }

      const { error } = await supabase.from('user_assets').insert({
        user_id: user.id,
        item_id: item.id,
        ticker: item.ticker || item.title.substring(0, 4).toUpperCase(),
        name: item.title,
        current_value: item.flip_price || 0,
        image_url: item.image_url
      });

      if (error) throw error;

      // Update UI to show success
      setAddedIds((prev) => [...prev, item.id]);
      setTimeout(() => {
        setAddedIds((prev) => prev.filter(id => id !== item.id));
      }, 2000);

    } catch (err: any) {
      console.error("Vault Error:", err.message);
      alert("Error adding to vault.");
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
      router.push(`/charts?id=${data.itemId}&ticker=${encodeURIComponent(targetKeyword)}`);
    } catch (err) {
      console.error(err);
      setIsDispatching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-32">
      <div className="bg-black p-6 pt-12 rounded-b-[40px] shadow-2xl sticky top-0 z-50">
        <div className="flex items-center justify-between mb-4 px-2">
          <h1 className="text-white text-[10px] font-black uppercase tracking-[0.3em] opacity-60">
            Terminal / {isDispatching ? "Scraping_Market..." : "Market_Query"}
          </h1>
          <Activity size={14} className={`${isDispatching ? 'text-green-500 animate-spin' : 'text-blue-500 animate-pulse'}`} />
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            value={query}
            onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch(query)}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Global Assets..."
            className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {query.length > 1 && (
          <section className="space-y-3">
            <div className="flex justify-between items-center px-2">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {isSearching ? "Querying Oracle..." : "Local Matches"}
              </p>
              <button onClick={() => handleGlobalSearch(query)} className="text-[10px] font-bold text-blue-600 underline">
                Force Global Scrape
              </button>
            </div>
            
            {results.map((item) => (
              <div 
                key={item.id} 
                onClick={() => handleGlobalSearch(item.title)}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex justify-between items-center group cursor-pointer hover:border-blue-200 active:scale-95 transition-all"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                    <img src={item.image_url || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase">{item.title}</p>
                    <p className="text-[9px] font-mono text-gray-400">Asset // {item.id.slice(0,8)}</p>
                  </div>
                </div>
                
                {/* NEW ACTION BUTTONS */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => addToPortfolio(e, item)}
                    className={`p-2 rounded-xl border transition-all ${
                      addedIds.includes(item.id) 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'bg-gray-50 border-gray-100 text-gray-400 hover:text-blue-600 hover:border-blue-200'
                    }`}
                  >
                    {addedIds.includes(item.id) ? <Check size={16} /> : <Plus size={16} />}
                  </button>
                  <ArrowUpRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            ))}

            {results.length === 0 && !isSearching && (
               <button 
                onClick={() => handleGlobalSearch(query)}
                className="w-full py-8 border-2 border-dashed border-gray-200 rounded-2xl text-center hover:bg-blue-50 transition-colors"
               >
                 <p className="text-xs font-black text-blue-600 uppercase">Dispatch Global Bot for "{query}"</p>
                 <p className="text-[9px] text-gray-400 uppercase mt-1">Full Market Scan (30s)</p>
               </button>
            )}
          </section>
        )}

        {!query && (
          <section className="space-y-4">
            <div className="bg-blue-600 rounded-3xl p-6 text-white overflow-hidden relative shadow-xl shadow-blue-500/20">
              <BarChart3 className="absolute right-[-10px] bottom-[-10px] w-32 h-32 opacity-20 rotate-12" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Market Index</p>
              <h2 className="text-2xl font-black italic tracking-tighter mt-1">Luxury Assets</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 font-mono">
              {['Watches', 'Sneakers', 'Electronics', 'Cards'].map((cat) => (
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
      
      {isDispatching && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center text-white">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
          <p className="text-xs font-black uppercase tracking-[0.3em]">Dispatching Global Scraper</p>
          <p className="text-[10px] text-gray-500 mt-2 font-mono">ESTIMATED_TIME: 15-30s</p>
        </div>
      )}
    </div>
  );
}