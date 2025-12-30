import { useState } from "react";
import { Search as SearchIcon, BarChart3, TrendingUp, Shield, ArrowUpRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";

export default function SearchTerminal() {
  const [query, setQuery] = useState("");

  // Day 38: Mocked "Terminal" Results ranking Charts > Assets
  const searchResults = [
    { type: 'CHART', label: 'Rolex Submariner Index', change: '+2.4%', status: 'Stable' },
    { type: 'CATEGORY', label: 'Luxury Timepieces', change: '-0.8%', status: 'Volatile' },
    { type: 'ASSET', label: 'Rolex Submariner 126610LN', sku: 'RLX-126610', price: '$14,200' },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-32">
      {/* Day 37: Search Header */}
      <div className="bg-black p-6 pt-12 rounded-b-[40px]">
        <h1 className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-60">
          Terminal Query / Search
        </h1>
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SKU, Asset, or Index..."
            className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="p-4 space-y-6 mt-4">
        {/* Day 38: Result Ranking Logic */}
        <section className="space-y-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Market Data (Top Results)</p>
          
          {searchResults.map((result, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:border-blue-500 transition-colors cursor-pointer">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  {result.type === 'CHART' && <BarChart3 className="text-blue-500" size={20} />}
                  {result.type === 'CATEGORY' && <TrendingUp className="text-purple-500" size={20} />}
                  {result.type === 'ASSET' && <Shield className="text-green-500" size={20} />}
                  
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">{result.label}</p>
                    <p className="text-[10px] font-mono text-gray-400 uppercase">
                      {result.type} {result.sku ? `// ${result.sku}` : `// ORACLE_INDEX`}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`text-sm font-black ${result.change?.startsWith('+') ? 'text-green-500' : 'text-gray-900'}`}>
                    {result.price || result.change}
                  </p>
                  <div className="flex items-center justify-end text-[8px] font-bold text-gray-400 uppercase">
                    View Data <ArrowUpRight size={10} className="ml-1" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Trending Categories Section */}
        <section className="space-y-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Global Sectors</p>
          <div className="grid grid-cols-2 gap-3">
            {['Luxury', 'Tech', 'Grails', 'Vintage'].map((sector) => (
              <div key={sector} className="bg-white p-4 rounded-2xl border border-gray-100 text-center shadow-sm">
                <p className="text-xs font-black uppercase">{sector}</p>
                <p className="text-[9px] font-bold text-blue-500 mt-1">Live Feed</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
