import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import MarketChart from "@/components/oracle/MarketChart";
import { Search, ShieldCheck, Activity, ArrowUpRight, Loader2, ChevronRight, Camera } from "lucide-react";
import BottomNav from '../components/BottomNav';

export default function OracleTerminal() {
  const [ticker, setTicker] = useState("RLX-SUB-126610");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false); // For AI Scan state
  
  // Ticker Menu State
  const [marketItems, setMarketItems] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

  useEffect(() => {
    fetchTickerData();
  }, [ticker]);

  // Fetch all available tickers for the menu
  useEffect(() => {
    const fetchMenu = async () => {
      const { data: items } = await supabase
        .from("items")
        .select("id, title, ticker, flip_price")
        .order('title', { ascending: true });
      if (items) setMarketItems(items);
      setMenuLoading(false);
    };
    fetchMenu();
  }, []);

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

  // AI CAMERA SCAN + SCRAPE CHAIN (3b)
  const handleCameraScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Image = (reader.result as string).split(',')[1];

        // 1. Identify via AI
        const aiRes = await fetch('/api/ai-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image }),
        });
        
        const { productName } = await aiRes.json();
        
        if (productName) {
          // 2. Trigger Scraper to ensure market data exists for this specific find
          await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword: productName }),
          });

          // 3. Update the ticker (triggers fetchTickerData automatically)
          setTicker(productName.toUpperCase());
        }
        setIsScanning(false);
      };
    } catch (err) {
      console.error("Chart AI Scan Error:", err);
      setIsScanning(false);
    }
  };

  const marketPrice = data?.price || 0;
  const estimatedFees = marketPrice * 0.1325;
  const shippingCost = 15.00;
  const netProfit = marketPrice - estimatedFees - shippingCost;

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-mono pb-24">
      {/* Top Header */}
      <div className="flex justify-between items-center border-b border-white/10 p-4 bg-[#0A0A0A] sticky top-0 z-10">
        <div>
          <h1 className="text-blue-500 font-black text-xs uppercase tracking-widest">Oracle Terminal v1.1</h1>
          <p className="text-[10px] text-gray-500 uppercase">Broker_Layout // {new Date().toLocaleTimeString()}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Camera Scan Button */}
          <label className="cursor-pointer p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-blue-600/20 hover:border-blue-500/50 transition-all flex items-center justify-center">
            {isScanning ? (
              <Loader2 size={14} className="animate-spin text-blue-500" />
            ) : (
              <Camera size={14} className="text-gray-400" />
            )}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              onChange={handleCameraScan} 
              disabled={isScanning}
            />
          </label>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input 
              className="bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-blue-500 outline-none w-48 transition-all"
              placeholder="FILTER TICKERS..."
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Visual Sync Overlay (Shows only when AI is working) */}
        {isScanning && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
             <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
             <p className="font-bold uppercase tracking-[0.3em] text-sm text-blue-500">Visual_Sync_Active</p>
             <p className="text-[10px] text-gray-500 mt-2 font-mono uppercase tracking-widest">Identifying Asset & Pulling Market Nodes</p>
          </div>
        )}

        {/* LEFT: MARKET WATCHLIST MENU */}
        <div className="w-64 border-r border-white/10 bg-black/40 hidden md:flex flex-col h-[calc(100vh-140px)]">
          <div className="p-3 border-b border-white/5 bg-white/5">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Market_Watchlist</p>
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {menuLoading ? (
              <div className="p-4 animate-pulse text-[10px] text-gray-600">SYNCING_TICKERS...</div>
            ) : (
              marketItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTicker(item.ticker || item.title)}
                  className={`w-full p-3 border-b border-white/[0.02] flex flex-col text-left transition-all hover:bg-white/5 ${
                    ticker === (item.ticker || item.title) ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-white uppercase">{item.ticker || "N/A"}</span>
                    <span className="text-[9px] text-green-500 font-bold">${(item.flip_price || 0).toLocaleString()}</span>
                  </div>
                  <span className="text-[8px] text-gray-500 truncate uppercase">{item.title}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: MAIN CONTENT AREA */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Price Chart */}
            <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl shadow-blue-500/5">
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
                    +LIVE_UPDATE
                  </div>
                </div>
              </div>
              
              <div className="h-64 md:h-80 w-full">
                <MarketChart itemId={data?.id} ticker={ticker} />
              </div>
            </div>
            
            {/* Intelligence Sidebar */}
            <div className="lg:col-span-1 space-y-4">
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

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-black">Confidence_Score</p>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="text-blue-500" size={18} />
                  <span className="text-xl font-black">{Math.round((data?.confidence || 0.85) * 100)}%</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                   <div className="bg-blue-600 h-full transition-all" style={{ width: `${(data?.confidence || 0.85) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Active Data Ingestion */}
          <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase mb-3 tracking-widest">Market_Ingestion_Nodes</h3>
            <div className="flex flex-wrap gap-4 font-mono">
              <div className="flex items-center space-x-2 text-[9px] bg-white/5 px-3 py-1.5 rounded-full border border-white/10 text-white/60">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span>INDEX_MAIN</span>
              </div>
              <div className="flex items-center space-x-2 text-[9px] bg-white/5 px-3 py-1.5 rounded-full border border-white/10 text-white/60">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                <span>VAULT_PROTO_v1</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </main>
  );
}