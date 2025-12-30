import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import MarketChart from "@/components/oracle/MarketChart";
import { Search, ShieldCheck, TrendingUp, TrendingDown, Info } from "lucide-react";
import BottomNav from '../components/BottomNav';

export default function OracleTerminal() {
  const [ticker, setTicker] = useState("RLX-SUB-126610");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickerData();
  }, [ticker]);

  const fetchTickerData = async () => {
    setLoading(true);
    const { data: marketData } = await supabase
      .from("market_data")
      .select("*")
      .eq("ticker", ticker)
      .single();
    
    if (marketData) setData(marketData);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white p-4 font-mono">
      {/* Top Header & Ticker Search */}
      <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
        <div>
          <h1 className="text-blue-500 font-black text-xs uppercase tracking-widest">Oracle Terminal v1.0</h1>
          <p className="text-[10px] text-gray-500">LIVE MARKET FEED</p>
        </div>
        
        {/* Ticker Selector (Top Right) */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
          <input 
            className="bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-blue-500 outline-none w-48"
            placeholder="ENTER TICKER..."
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
          />
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-4 gap-4 h-[60vh]">
        {/* Left: Price Chart (3/4 Width) */}
        <div className="col-span-3 bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-black italic">{data?.name || "LOADING..."}</h2>
              <p className="text-gray-500 text-xs">{ticker}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-green-500">${data?.price?.toLocaleString() || "0"}</p>
              <p className="text-[10px] text-green-500/50">+2.41% (24H)</p>
            </div>
          </div>
          
          <div className="h-64 w-full">
             <MarketChart ticker={ticker} />
          </div>
        </div>

        {/* Right: Confidence & High/Lows */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-[10px] text-gray-500 mb-2 uppercase">Confidence Score</p>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="text-blue-500" size={20} />
              <span className="text-xl font-black">{(data?.confidence * 100) || 0}%</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">24H High</p>
              <p className="text-sm font-bold text-gray-200">${data?.high24 || "0"}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">24H Low</p>
              <p className="text-sm font-bold text-gray-200">${data?.low24 || "0"}</p>
            </div>
            <div className="pt-2 border-t border-white/5">
              <p className="text-[10px] text-gray-500 uppercase">Volatility</p>
              <p className="text-sm font-bold text-orange-500">MEDIUM</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scraper Source Log (Bottom) */}
      <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-[10px] font-black text-gray-500 uppercase mb-2">Active Data Sources</h3>
        <div className="flex gap-4">
            <div className="flex items-center space-x-2 text-[10px] bg-white/5 px-3 py-1 rounded-full border border-white/10">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span>ROLEX_OFFICIAL</span>
            </div>
            <div className="flex items-center space-x-2 text-[10px] bg-white/5 px-3 py-1 rounded-full border border-white/10">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span>CHRONO24_API</span>
            </div>
        </div>
      </div>
        <BottomNav />
    </main>
  );
}
