import { Search as SearchIcon, TrendingUp, BarChart3 } from 'lucide-react';
import BottomNav from "@/components/BottomNav";

export default function SearchTerminal() {
  return (
    <main className="min-h-screen bg-[#F9FAFB] pb-24">
      <div className="p-4 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search Assets, SKUs, or Market Indices..."
            className="w-full bg-white border-none rounded-2xl py-4 pl-12 pr-4 shadow-sm font-medium text-sm focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Phase 6: Prioritize Charts & Indices */}
        <section className="space-y-3">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Market Indices</h2>
          <div className="grid grid-cols-1 gap-3">
            {['Luxury Watches', 'High-End Tech', 'Grail Sneakers'].map((index) => (
              <div key={index} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <BarChart3 size={18} className="text-blue-500" />
                  <span className="font-bold text-sm">{index}</span>
                </div>
                <TrendingUp size={16} className="text-green-500" />
              </div>
            ))}
          </div>
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
