import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import MarketChart from "@/components/oracle/MarketChart";
import { Search, Loader2, Camera, Activity } from "lucide-react";
import BottomNav from '../components/BottomNav';
import { toast, Toaster } from 'react-hot-toast';
import { uploadImage } from "@/lib/uploadImage";
import CameraScanner from '@/components/vault/CameraScanner'; 

function GlobalTicker() {
  return (
    <div className="w-full bg-blue-600 text-white py-1.5 overflow-hidden whitespace-nowrap border-b border-white/20 shadow-lg z-50">
      <div className="animate-marquee inline-block font-black text-[10px] uppercase tracking-[0.2em]">
        <span className="mx-4 text-white/90">USD/JPY: 148.22 <span className="text-green-300">▲</span></span>
        <span className="mx-4 text-white/90">USD/GBP: 0.79 <span className="text-red-300">▼</span></span>
        <span className="mx-4 text-blue-200">IMPORT DUTY (JP): 10%</span>
        <span className="mx-4 text-blue-200">IMPORT DUTY (UK): 5%</span>
        <span className="mx-4 text-yellow-400">NODE STATUS: 5 REGIONS ACTIVE</span>
        <span className="mx-4 text-white/90">EU VAT ADJ: +15%</span>
        <span className="mx-4 text-white/90">ARBITRAGE SPREAD (GLOBAL): 14.2% AVG</span>
        <span className="mx-4 text-white/90">USD/JPY: 148.22 ▲</span>
        <span className="mx-4 text-white/90">USD/GBP: 0.79 ▼</span>
        <span className="mx-4 text-blue-200">IMPORT DUTY (JP): 10%</span>
      </div>
    </div>
  );
}

export default function OracleTerminal() {
  const router = useRouter();
  const [ticker, setTicker] = useState("RLX-SUB-126610"); // Default, will be overridden by search
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

useEffect(() => {
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };
  checkUser();
}, []);
  // AI Scan State
  const [isScanning, setIsScanning] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  // Watchlist State
  const [marketItems, setMarketItems] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

  // 1. Listen for search query from Landing Page
  useEffect(() => {
    if (router.isReady && router.query.q) {
      setTicker((router.query.q as string).toUpperCase());
    }
  }, [router.isReady, router.query.q]);

  // 2. Fetch Menu (Runs once)
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

  // 3. Fetch Data when ticker changes
  useEffect(() => {
    const fetchTickerData = async () => {
      setLoading(true);
      try {
        const { data: itemData, error } = await supabase
          .from("items")
          .select("*")
          .eq("ticker", ticker)
          .single();

        if (error || !itemData) {
          setData(null);
        } else {
          setData(itemData);
        }
      } catch (err) {
        console.error("Critical Terminal Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickerData();
  }, [ticker]);

  // AI CAMERA SCAN
  const handleCameraScan = async (e: React.ChangeEvent<HTMLInputElement> | { target: { files: File[] } }) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64Image = (reader.result as string).split(',')[1];
        // Optional: uploadImage logic if you need it stored
        // const publicUrl = await uploadImage(file); 
        
        const aiRes = await fetch('/api/ai-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image }),
        });
        
        const resData = await aiRes.json();
        const productName = resData.productName;
        
        if (productName) {
          toast.success(`Identified: ${productName}`);
          // Trigger Scraper to ensure market data exists
          await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword: productName }),
          });

          // Update the ticker to load the new chart
          setTicker(productName.toUpperCase());
        } else {
          toast.error("Could not identify asset.");
        }
        setIsScanning(false);
      };
    } catch (err) {
      console.error("Chart AI Scan Error:", err);
      toast.error("Scan failed.");
      setIsScanning(false);
    }
  };

  return (
    <>
      <GlobalTicker />
      <main className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-mono pb-24">
        
        {/* Top Header */}
        <div className="flex justify-between items-center border-b border-white/10 p-4 bg-[#0A0A0A] sticky top-0 z-10">
          <div>
            <h1 className="text-blue-500 font-black text-xs uppercase tracking-widest">Flip Terminal v1.16</h1>
            <p className="text-[10px] text-gray-500 uppercase">Public_Read_Only // {new Date().toLocaleTimeString()}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowScanner(true)}
              className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-blue-600/20 transition-all group relative"
            >
              {isScanning ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Camera size={16} className="text-gray-400 group-hover:text-blue-400" />}
            </button>

            <form onSubmit={(e) => { e.preventDefault(); /* Ticker state already updates via onChange */ }} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input 
                className="bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-blue-500 outline-none w-48 md:w-64 transition-all"
                placeholder="SEARCH ASSET DNA..."
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
              />
            </form>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Visual Sync Overlay */}
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
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Global_Index</p>
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {menuLoading ? (
                <div className="p-4 animate-pulse text-[10px] text-gray-600">SYNCING_TICKERS...</div>
              ) : (
                marketItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTicker((item.ticker || item.title).toUpperCase())}
                    className={`w-full p-3 border-b border-white/[0.02] flex flex-col text-left transition-all hover:bg-white/5 ${
                      ticker === (item.ticker || item.title).toUpperCase() ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-white uppercase">{item.ticker || "N/A"}</span>
                      <span className="text-[9px] text-green-500 font-bold">${(item.flip_price || 0).toLocaleString()}</span>
                    </div>
                    <span className="text-[8px] text-gray-500 truncate w-full block uppercase">{item.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>
          <Toaster position="top-right" />

          {/* RIGHT: MAIN CHART AREA */}
          <div className="flex-1 p-4 md:p-8 overflow-y-auto">
            <div className="w-full max-w-6xl mx-auto space-y-6">
              
              {/* Chart Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-2xl shadow-blue-500/5">
                <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white">
                      {loading ? "LOADING ASSET..." : (data?.title || ticker || "SELECT_ASSET")}
                    </h2>
                    <p className="text-gray-500 text-sm font-mono tracking-widest mt-1">
                      {ticker ? `// ${ticker}` : "---"}
                    </p>
                  </div>
                  
                  <div className="text-left md:text-right">
                    <p className="text-4xl md:text-5xl font-black text-green-500">
                      ${data?.flip_price ? data.flip_price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
                    </p>
                    <div className="flex items-center md:justify-end gap-1 text-[10px] font-bold text-green-500/50 uppercase tracking-widest mt-2">
                      <Activity size={10} className="animate-pulse" />
                      +LIVE_MARKET_RATE
                    </div>
                  </div>
                </div>
                
                {/* Chart Container - Made it much taller now that we have the space */}
                <div className="h-80 md:h-[500px] w-full">
                  <MarketChart itemId={data?.id} ticker={ticker} />
                </div>
              </div>

            {/* Call to Action for Auth Wall - ONLY SHOW IF NO USER */}
    {!user && (
      <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-6 text-center mt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <h3 className="text-lg font-black uppercase text-white mb-2">Want to trade, track, or arbitrage this asset?</h3>
        <p className="text-sm text-gray-400 mb-6">Create a free Vault account to access Order Books, Portfolio Tracking, and Instant Liquidity routing.</p>
        <button 
          onClick={() => router.push('/login')} 
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold uppercase tracking-widest text-xs transition-all"
        >
          Initialize Vault Identity
        </button>
      </div>
    )}

            </div>
          </div>
        </div> 

        {showScanner && (
          <CameraScanner 
            onClose={() => setShowScanner(false)} 
            onCapture={async (file) => {
              setShowScanner(false);
              const fakeEvent = { target: { files: [file] } } as any;
              await handleCameraScan(fakeEvent);
            }} 
          />
        )}
        <BottomNav />
      </main>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </>
  );
}