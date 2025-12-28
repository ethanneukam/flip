// pages/charts.tsx
import { useEffect, useState } from 'react';
import { Timer, TrendingUp, AlertCircle, ChevronRight } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { OracleService } from '../lib/oracle-api';

export default function OracleDashboard() {
  const [indices, setIndices] = useState([]);
  const [topMovers, setTopMovers] = useState([]);
  
  // Logic to show user when the next Vercel Cron runs
  const [nextSync, setNextSync] = useState("Calculating...");

  useEffect(() => {
    // Mocking the countdown to the next daily scrape
    const now = new Date();
    const tonight = new Date().setHours(24, 0, 0, 0);
    const diff = Math.abs(tonight - now.getTime());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    setNextSync(`${hours}h remaining until next global sync`);
  }, []);

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-24 font-sans">
      {/* 1. Global Status Bar (The "Bloomberg" Tape) */}
      <div className="bg-black text-white px-4 py-2 flex justify-between items-center overflow-hidden whitespace-nowrap">
        <div className="flex space-x-6 animate-marquee">
          <span className="text-[10px] font-mono tracking-tighter uppercase">
            ROLEX SUB: $14,200 (+2.1%) • PANDA DUNK: $185 (-1.2%) • IPHONE 15P: $920 (+0.4%)
          </span>
        </div>
      </div>

      <main className="p-4 space-y-6">
        {/* 2. Oracle Identity & Sync Timer */}
        <header className="space-y-1">
          <h1 className="text-2xl font-black italic tracking-tighter">ORACLE</h1>
          <div className="flex items-center space-x-2 text-gray-500">
            <Timer size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{nextSync}</span>
          </div>
        </header>

        {/* 3. Category Indices (Days 14-15 Focus) */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Luxury Index</p>
            <p className="text-xl font-black">$24,102</p>
            <span className="text-xs font-bold text-green-500">+1.4%</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Tech/Electronics</p>
            <p className="text-xl font-black">$1,450</p>
            <span className="text-xs font-bold text-red-500">-3.2%</span>
          </div>
        </section>

        {/* 4. Top Movers (The Volatility Tab) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Top Movers</h2>
            <button className="text-[10px] font-bold text-blue-600">VIEW ALL</button>
          </div>
          
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-white p-4 rounded-2xl flex items-center justify-between border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg" />
                  <div>
                    <p className="text-sm font-bold leading-none">Jordan 1 Retro High</p>
                    <p className="text-[10px] text-gray-400 mt-1 font-mono">SKU: AJ1-85-RED</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black">$1,200</p>
                  <p className="text-[10px] font-bold text-green-500">+8.4%</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Oracle Disclaimer */}
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex space-x-3">
          <AlertCircle className="text-blue-500 shrink-0" size={18} />
          <p className="text-[10px] text-blue-700 leading-normal font-medium">
            Oracle data is currently updated every 24 hours at 00:00 UTC via automated scraping cycles. Confidence scores reflect data density across 12+ secondary markets.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
