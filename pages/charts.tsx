import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import MarketChart from "@/components/oracle/MarketChart";
import { Search, ShieldCheck, Activity, ArrowUpRight, Loader2, ChevronRight, Camera, Bell, Lock, Globe, Ship, Percent, TrendingUp } from "lucide-react";
import { PriceAlertModal } from "@/components/PriceAlertModal"; // Update path if needed
import BottomNav from '../components/BottomNav';
import OrderBook from '@/components/oracle/OrderBook';
import { UpgradeModal } from "@/components/UpgradeModel";
import { toast, Toaster } from 'react-hot-toast';
import { uploadImage } from "@/lib/uploadImage";
import CameraScanner from '@/components/vault/CameraScanner'; // Adjust path if your file is named differently
import router from "next/router";

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
          {/* Duplicate for seamless loop */}
          <span className="mx-4 text-white/90">USD/JPY: 148.22 ▲</span>
          <span className="mx-4 text-white/90">USD/GBP: 0.79 ▼</span>
          <span className="mx-4 text-blue-200">IMPORT DUTY (JP): 10%</span>
        </div>
      </div>
    );
  }
export default function OracleTerminal() {
  const [ticker, setTicker] = useState("RLX-SUB-126610");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
const [isScanning, setIsScanning] = useState(false); // For AI Scan state
const [showScanner, setShowScanner] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  // Ticker Menu State
  const [marketItems, setMarketItems] = useState<any[]>([]);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [menuLoading, setMenuLoading] = useState(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [userTier, setUserTier] = useState<"free" | "operative" | "market_maker" | "syndicate">("free");
  const TIER_LIMITS = {
  free: 25,
  operative: 50,
  market_maker: 500,
  syndicate: Infinity,
};
// 1. Fetch Menu & User Tier (Runs once)
useEffect(() => {
    const initTerminal = async () => {
      // Fetch Menu
      const { data: items } = await supabase
        .from("items")
        .select("id, title, ticker, flip_price")
        .order('title', { ascending: true });
      if (items) setMarketItems(items);
      setMenuLoading(false);

      // Fetch User Tier
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', user.id)
          .single();
        
       // Logical Mapping: If DB says 'pro', map to 'market_maker'
        const tier = profile?.subscription_tier;
        if (tier === 'pro' || tier === 'market_maker') setUserTier('market_maker');
        else if (tier === 'operative') setUserTier('operative');
        else if (tier === 'syndicate') setUserTier('syndicate');
        else setUserTier('free');
      }
    };
    initTerminal();
  }, []);

  // 2. Fetch Data & Set up Realtime (Runs when ticker changes)
useEffect(() => {
    fetchTickerData();

    // ONLY subscribe to realtime if user is Market Maker or Syndicate
    let channel: any;
    
    if (userTier === 'market_maker' || userTier === 'syndicate') {
      channel = supabase
        .channel('realtime-feed')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'feed_events' },
          (payload) => {
            setEvents((prev) => [payload.new, ...prev].slice(0, 50)); 
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [ticker, userTier]); // Add userTier as a dependency

  // 3. Helper Functions
  const fetchTickerData = async () => {
    setLoading(true);
    try {
      const { data: itemData, error: itemError } = await supabase
        .from("items")
        .select("*")
        .eq("ticker", ticker)
        .single();

      if (itemError || !itemData) {
        setData(null);
        return;
      }
      setData(itemData);
    } catch (err) {
      console.error("Critical Oracle Error:", err);
    } finally {
      setLoading(false);
    }
  };

const handleBuyAction = async () => {
    if (!data) return;
    setLoading(true);

    // 1. Check User's Current Vault Count
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Auth Required");

    const { count, error: countError } = await supabase
      .from('user_assets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // 2. Enforce Limits
    const limit = TIER_LIMITS[userTier as keyof typeof TIER_LIMITS] || 25;
    
    if (count !== null && count >= limit) {
      setIsUpgradeModalOpen(true);
      setLoading(false);
      return;
    }
    const { data: listing } = await supabase
      .from('user_assets')
      .select('*, profiles(username)')
      .eq('sku', ticker)
      .eq('is_for_sale', true)
      .limit(1)
      .maybeSingle();

    if (listing) {
      const confirmBuy = confirm(`Buy this ${ticker} from @${listing.profiles?.username} for $${listing.current_value}?`);
      if (confirmBuy) alert("Processing P2P Transaction...");
    } else {
      window.open(`https://www.amazon.com/s?k=${ticker}`, '_blank');
    }
    setLoading(false);
  };
  // AI CAMERA SCAN + SCRAPE CHAIN (3b)
const handleCameraScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. LOCK CHECK: Market Maker (LVL_02) or Syndicate (LVL_03) only
    const hasVisionAccess = userTier === 'market_maker' || userTier === 'syndicate';
    
    if (!hasVisionAccess) {
      setIsUpgradeModalOpen(true);
      e.target.value = ''; 
      return;
    }

    // 2. FILE DEFINITION (Crucial fix)
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);

    try {
      const reader = new FileReader();
      // Now 'file' is defined and can be read
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64Image = (reader.result as string).split(',')[1];
const publicUrl = await uploadImage(file); // Upload to Supabase Storage
// Now pass this publicUrl into your state or the next step of the chain
        // 3. Identify via AI
        const aiRes = await fetch('/api/ai-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image }),
        });
        
        const resData = await aiRes.json();
        const productName = resData.productName;
        
        if (productName) {
          // 4. Trigger Scraper to ensure market data exists
          await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword: productName }),
          });

          // 5. Update the ticker (triggers fetchTickerData automatically)
          setTicker(productName.toUpperCase());
        }
        setIsScanning(false);
      };
    } catch (err) {
      console.error("Chart AI Scan Error:", err);
      setIsScanning(false);
    }
  };
const handleAcquireAsset = async (scannedItem: any) => {
  setLoading(true);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return toast.error("Auth Required");

  // Calculate Landed Cost (Price + Shipping + Duty)
  const landedCost = (data?.flip_price * 1.12) + 45;

  const { error } = await supabase
    .from('user_assets') // Standardized table name
    .insert([{
      user_id: user.id,
      title: data?.title,
      sku: ticker,
      acquired_price: landedCost,
      current_value: data?.flip_price,
      status: 'in_vault',
      image_url: data?.image_url
    }]);

  if (error) {
    toast.error("Vault sequence failed.");
  } else {
    toast.success(`${ticker} locked in Vault.`);
  }
  setLoading(false);
};
const handleQuickOrder = async (type: 'buy' | 'sell') => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return toast.error("AUTH_REQUIRED");
  if (!data?.flip_price) return toast.error("PRICE_NOT_INDEXED");

  // 1. If selling, verify ownership (Keep your existing check)
  if (type === 'sell') {
    const { data: vaultItem } = await supabase
      .from('user_assets')
      .select('id')
      .eq('user_id', user.id)
      .eq('sku', ticker)
      .limit(1)
      .maybeSingle();

    if (!vaultItem) return toast.error("VAULT_ERROR: Asset not found in inventory.");
  }

  // 2. THE MATCH-MAKER: If buying, try to find an active seller immediately
  if (type === 'buy') {
    const { data: matchingOrder } = await supabase
      .from('market_orders')
      .select('*')
      .eq('ticker', ticker)
      .eq('order_type', 'sell')
      .eq('status', 'open')
      .lte('price', data.flip_price) // Price is at or below Oracle rate
      .order('price', { ascending: true })
      .limit(1)
      .maybeSingle();

 if (matchingOrder) {
  toast.loading("MATCH_FOUND: Initializing Escrow...");
  try {
    // Call our new API instead of the library directly
    const res = await fetch('/api/escrow/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: matchingOrder.id, userId: user.id })
    });

    if (!res.ok) throw new Error("Escrow initialization failed");

    toast.success("TRADE_LOCKED: Proceed to Ops Center.");
    router.push('/ops');
    return;
  } catch (err) {
    return toast.error("EXECUTION_ERROR: Could not lock trade.");
  }
}
  }

  // 3. FALLBACK: If no match is found, or if it's a sell order, post to board
  const { error } = await supabase.from('market_orders').insert({
    ticker,
    order_type: type,
    price: data.flip_price,
    quantity: 1,
    user_id: user.id,
    status: 'open',
    item_id: data.id // CRITICAL: Make sure your terminal data includes the item UUID
  });

  if (error) toast.error(error.message);
  else toast.success(`MARKET_SYNC: ${type.toUpperCase()} order posted to Order Book.`);
};

 const handleInstantSell = async (inventoryItem: any) => {
     // 1. Get the current user session
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    toast.error("You must be logged in to sell.");
    return;
  }
  const sellPrice = inventoryItem.market_value;
  const profit = sellPrice - inventoryItem.acquired_price;

  // 1. Update Inventory status to 'sold'
  const { error: invError } = await supabase
    .from('inventory')
    .update({ status: 'sold' })
    .eq('id', inventoryItem.id);

  if (invError) return toast.error("Liquidity Check Failed.");

  // 2. Record the Trade
  await supabase.from('trades').insert([{
    user_id: user.id,
    item_id: inventoryItem.id,
    type: 'SELL',
    amount: sellPrice
  }]);

  // 3. Update User Balance (Simulated here, usually done via RPC)
  toast.success(`Sold for $${sellPrice.toFixed(2)}! Net: $${profit.toFixed(2)}`);
};   
    
  const marketPrice = data?.flip_price || 0; // Use flip_price here
  const estimatedFees = marketPrice * 0.1325;
  const shippingCost = 15.00;
  const netProfit = marketPrice - estimatedFees - shippingCost;

return (
    <>
      <GlobalTicker />
      <main className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-mono pb-24">
        
        {/* Top Header */}
        <div className="flex justify-between items-center border-b border-white/10 p-4 bg-[#0A0A0A] sticky top-0 z-10">
          <div>
            <h1 className="text-blue-500 font-black text-xs uppercase tracking-widest">Oracle Terminal v1.1</h1>
            <p className="text-[10px] text-gray-500 uppercase">Broker_Layout // {new Date().toLocaleTimeString()}</p>
          </div>
          
          <div className="flex items-center space-x-2">
          <button 
  onClick={() => setShowScanner(true)}
  className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-blue-600/20 transition-all"
>
  {isScanning ? <Loader2 size={14} className="animate-spin text-blue-500" /> : <Camera size={14} className="text-gray-400" />}
</button>

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
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Market_Watchlist</p>
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
<Toaster position="top-right" />
          {/* RIGHT: MAIN CONTENT AREA */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              
              {/* MIDDLE: Price Chart & Arbitrage Section */}
              <div className="lg:col-span-3 space-y-4">
                
                {/* Chart Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl shadow-blue-500/5">
                  <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                    <div>
                      <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                        {loading ? "LOADING ASSET..." : (data?.name || (ticker ? `${ticker}_NOT_FOUND` : "SELECT_TICKER"))}
                      </h2>
                      <p className="text-gray-500 text-xs font-mono">{ticker}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-3xl font-black text-green-500">
                        ${data?.flip_price ? data.flip_price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
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

                {/* Global Arbitrage Radar */}
                <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-2xl p-4 shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                      <Globe size={14} className="animate-spin-slow" /> Global_Arbitrage_Engine
                    </h3>
                    <div className="flex gap-2">
                      <span className="bg-blue-500/20 text-blue-400 text-[8px] px-2 py-0.5 rounded border border-blue-500/30">JP_NODE: ON</span>
                      <span className="bg-green-500/20 text-green-400 text-[8px] px-2 py-0.5 rounded border border-green-500/30">UK_NODE: ON</span>
                    </div>
                  </div>
                  
                  {/* FIXED: Added opening bracket <div below */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {data ? (
                      <>
                          {/* Japan Node Card */}
                          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <div className="flex justify-between text-[9px] text-gray-500 mb-1 uppercase"><span>Origin</span><span>Net Profit</span></div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold flex items-center gap-1"><Globe size={10} className="text-red-500"/> TOKYO_JP</span>
                              <span className="text-sm font-black text-green-400">+${(marketPrice * 0.18).toFixed(2)}</span>
                            </div>
                            <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                              <div className="bg-green-500 h-full w-[72%]" />
                            </div>
                          </div>

                          {/* London Node Card */}
                          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <div className="flex justify-between text-[9px] text-gray-500 mb-1 uppercase"><span>Origin</span><span>Net Profit</span></div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold flex items-center gap-1"><Globe size={10} className="text-blue-500"/> LONDON_UK</span>
                              <span className="text-sm font-black text-green-400">+${(marketPrice * 0.09).toFixed(2)}</span>
                            </div>
                            <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                              <div className="bg-green-500 h-full w-[45%]" />
                            </div>
                          </div>

                          {/* Landed Cost Summary */}
                          <div className="bg-blue-600/10 p-3 rounded-xl border border-blue-500/20 flex flex-col justify-center">
                             <p className="text-[8px] text-blue-400 uppercase font-black tracking-widest">Est_Landed_Cost</p>
                             <p className="text-lg font-black text-white">${(marketPrice * 1.12 + 45).toFixed(2)}</p>
                             <p className="text-[8px] text-gray-500 italic">Includes 10% Duty + $45 DHL Shipping</p>
                          </div>
                      </>
                    ) : (
                      <div className="col-span-3 py-4 text-center text-[10px] text-gray-500 uppercase italic">
                        Waiting for asset selection...
                      </div>
                    )}
                  </div>
                </div>

                {/* Ingestion Nodes */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
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
              </div> {/* End Column 1 (Chart & Arbitrage) */}

              {/* FAR RIGHT: Intelligence & Actions */}
              <div className="lg:col-span-1 space-y-4">
                <button 
                  onClick={handleBuyAction}
                  disabled={!data}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-tighter rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <ArrowUpRight size={18} />
                  Acquire Asset
                </button>
                {/* Quick Market Alignment */}
<div className="bg-blue-600/5 border border-blue-500/20 rounded-xl p-3 space-y-2">
  <div className="flex justify-between items-center">
    <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Oracle_Execution</span>
    <TrendingUp size={12} className="text-blue-500" />
  </div>
  <p className="text-[9px] text-gray-500 leading-tight">
    Align internal liquidity with global <span className="text-white">${data?.flip_price?.toLocaleString()}</span>.
  </p>
  <div className="grid grid-cols-2 gap-2">
    <button 
      onClick={() => handleQuickOrder('buy')}
      className="py-2 bg-green-500/20 hover:bg-green-500/30 text-green-500 border border-green-500/20 rounded-lg text-[9px] font-black uppercase transition-all"
    >
      Insta_Bid
    </button>
    <button 
      onClick={() => handleQuickOrder('sell')}
      className="py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/20 rounded-lg text-[9px] font-black uppercase transition-all"
    >
      Insta_List
    </button>
  </div>
</div>
                <button 
                  onClick={() => {
                    if (userTier === 'market_maker' || userTier === 'syndicate') {
                      setIsAlertModalOpen(true);
                    } else {
                      setIsUpgradeModalOpen(true);
                    }
                  }}
                  disabled={!data}
                  className={`w-full py-4 border border-white/10 font-black uppercase tracking-tighter rounded-xl transition-all flex items-center justify-center gap-2 ${
                    (userTier === 'market_maker' || userTier === 'syndicate')
                      ? 'bg-white/5 hover:bg-white/10 text-white/70' 
                      : 'bg-red-900/10 text-red-400/50'
                  }`}
                >
                  {(userTier === 'market_maker' || userTier === 'syndicate') ? (
                    <><Bell size={16} /><span>Set Price Alert</span></>
                  ) : (
                    <><Lock size={16} /><span>LOCKED (PRO)</span></>
                  )}
                </button>

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

                <div className="h-[400px]">
                  <OrderBook ticker={ticker} />
                </div>

                {/* Confidence Score Block */}
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
              </div> {/* End Column 2 (Sidebar Actions) */}

            </div> {/* End Grid */}
          </div> {/* End Right Main Content Scroll Area */}
        </div> {/* End Flex Layout Wrapper */}
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

    {/* Global Marquee CSS */}
<style>{`
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .animate-marquee {
    display: inline-block;
    animation: marquee 30s linear infinite;
  }
  .animate-spin-slow {
    animation: spin 8s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`}</style>

      {/* PRICE ALERT MODAL */}
      {isAlertModalOpen && data && (
        <PriceAlertModal 
          item={{ id: data.id, title: data.title, ticker: ticker }} 
          onClose={() => setIsAlertModalOpen(false)} 
        />
      )}

      {/* UPGRADE MODAL */}
      {isUpgradeModalOpen && (
        <UpgradeModal 
          userTier={userTier} 
          onClose={() => setIsUpgradeModalOpen(false)} 
        />
      )}
    </>
  );
}
