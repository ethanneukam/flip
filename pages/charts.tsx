import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import MarketChart from "@/components/oracle/MarketChart";
import { Search, ShieldCheck, Activity, ArrowUpRight, Loader2 } from "lucide-react";
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

  // Profit Logic Constants
  const marketPrice = data?.price || 0;
  const estimatedFees = marketPrice * 0.1325; // Standard 13.25%
  const shippingCost = 15.00;
  const netProfit = marketPrice - estimatedFees - shippingCost;

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white p-4 font-mono pb-24">
      {/* Top Header & Ticker Search */}
      <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
        <div>
          <h1 className="text-blue-500 font-black text-xs uppercase tracking-widest">Oracle Terminal v1.1</h1>
          <p className="text-[10px] text-gray-500">LIVE MARKET FEED // {new Date().toLocaleTimeString()}</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
          <input 
            className="bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-blue-500 outline-none w-48 transition-all"
            placeholder="ENTER TICKER..."
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
          />
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[60vh]">
        
        {/* Left: Price Chart (3/4 Width) */}
        <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                {data?.name || (loading ? "LOADING ASSET..." : "TICKER_NOT_FOUND")}
              </h2>
              <p className="text-gray-500 text-xs font-mono">{ticker}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-3xl font-black text-green-500">
                ${marketPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center md:justify-end gap-1 text-[10px] font-bold text-green-500/50 uppercase tracking-widest">
                <Activity size={10} className="animate-pulse" />
                +2.41% (24H_VOL)
              </div>
            </div>
          </div>
          
          <div className="h-64 md:h-80 w-full">
            {/* FIX: Passing the internal DB id to trigger historical logs */}
            <MarketChart itemId={data?.id} ticker={ticker} />
          </div>
        </div>
        
        {/* Right: Intelligence Sidebar (1/4 Width) */}
        <div className="lg:col-span-1 space-y-4">
          
          {/* Profit Breakdown Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Profit_Analysis</p>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 font-mono">Market_Price</span>
                <span className="font-bold">${marketPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-red-400">
                <span className="font-mono">Est_Fees</span>
                <span className="font-bold">-${estimatedFees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-red-400">
                <span className="font-mono">Logistics</span>
                <span className="font-bold">-${shippingCost.toFixed(2)}</span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-blue-500">Net_Profit</span>
                <span className="text-xl font-black text-white">
                  ${netProfit > 0 ? netProfit.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0.00"}
                </span>
              </div>
            </div>
          </div>

          {/* Confidence Score */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-black">Confidence_Score</p>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="text-blue-500" size={18} />
              <span className="text-xl font-black">{Math.round((data?.confidence || 0.85) * 100)}%</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
               <div 
                 className="bg-blue-600 h-full transition-all duration-1000" 
                 style={{ width: `${(data?.confidence || 0.85) * 100}%` }}
               />
            </div>
          </div>

          {/* Market Sentiment / Status */}
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Oracle_Status</p>
            <p className="text-[10px] text-blue-200/70 leading-relaxed font-mono">
              SYSTEM_READY: Currently monitoring CHRONO24 and ROLEX_INDEX for discrepancies.
            </p>
          </div>
        </div>
      </div>

      {/* Scraper Source Log (Bottom) */}
      <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-[10px] font-black text-gray-500 uppercase mb-3 tracking-widest">Active_Data_Ingestion</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2 text-[10px] bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="font-mono">NODE_ROLEX_MAIN</span>
          </div>
          <div className="flex items-center space-x-2 text-[10px] bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="font-mono">NODE_CHRONO_INDEX</span>
          </div>
          <div className="flex items-center space-x-2 text-[10px] bg-white/5 px-3 py-1.5 rounded-full border border-white/10 opacity-50">
            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
            <span className="font-mono">NODE_FB_MARKET (OFFLINE)</span>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
