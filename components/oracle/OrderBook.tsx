import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { ArrowDown, ArrowUp, ShoppingCart, Tag, Loader2 } from 'lucide-react';
import { useRouter } from 'next/router';

interface Order {
  id: string;
  price: number;
  quantity: number;
  user_id: string;
  ticker: string;
}

export default function OrderBook({ ticker }: { ticker: string }) {
  const router = useRouter();
  const [bids, setBids] = useState<Order[]>([]); // Buy Orders (Green)
  const [asks, setAsks] = useState<Order[]>([]); // Sell Orders (Red)
  const [userOrders, setUserOrders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- NEW: State for Quick-Entry Form ---
  const [showForm, setShowForm] = useState<{type: 'buy' | 'sell', active: boolean}>({type: 'buy', active: false});
  const [orderPrice, setOrderPrice] = useState('');
  const [orderQty, setOrderQty] = useState('1');

  useEffect(() => {
    if (!ticker) return;
    fetchBook();
    
    // Subscribe to live changes
    const subscription = supabase
      .channel('order_book_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'market_orders', 
        filter: `ticker=eq.${ticker}` 
      }, () => fetchBook())
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [ticker]);

  const fetchBook = async () => {
    // Fetch Sells (Asks) - Lowest price first
    const { data: askData } = await supabase
      .from('market_orders')
      .select('*')
      .eq('ticker', ticker)
      .eq('order_type', 'sell')
      .eq('status', 'open')
      .order('price', { ascending: true })
      .limit(10);

    // Fetch Buys (Bids) - Highest price first
    const { data: bidData } = await supabase
      .from('market_orders')
      .select('*')
      .eq('ticker', ticker)
      .eq('order_type', 'buy')
      .eq('status', 'open')
      .order('price', { ascending: false })
      .limit(10);

    const { data: { user } } = await supabase.auth.getUser();

    setAsks(askData || []);
    setBids(bidData || []);
    if (user) checkUserOrders(user.id);
  };

  const checkUserOrders = async (userId: string) => {
    const { data } = await supabase.from('market_orders').select('id').eq('user_id', userId);
    if (data) setUserOrders(data.map(o => o.id));
  };

  // --- NEW: Submit Order Logic ---
const submitOrder = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert("Please login");

  // IF SELLING: Verify ownership first
  if (showForm.type === 'sell') {
    const { data: ownership, error: ownerError } = await supabase
      .from('items')
      .select('id')
      .eq('user_id', user.id)
      .eq('ticker', ticker) // Ensure your items table has a ticker column
      .limit(1);

    if (ownerError || !ownership || ownership.length === 0) {
      alert("Verification Failed: This asset is not in your Secure Vault.");
      return;
    }
  }

  // Proceed with listing if verification passes
  const { error } = await supabase.from('market_orders').insert({
    ticker: ticker,
    order_type: showForm.type,
    price: parseFloat(orderPrice),
    quantity: parseInt(orderQty),
    user_id: user.id,
    status: 'open'
  });

  if (error) alert(error.message);
  else {
    setShowForm({ ...showForm, active: false });
    fetchBook();
  }
};

  /**
   * STRIPE INTEGRATION: handleBuy
   * Triggers the real-money checkout session
   */
  const handleBuy = async (order: Order) => {
    setIsProcessing(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (!authSession) {
        alert("Please login to purchase");
        setIsProcessing(false);
        return;
      }

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          price: order.price,
          ticker: ticker,
          buyerId: authSession.user.id
        }),
      });

      const { url, error } = await response.json();
      
      if (error) throw new Error(error);
      if (url) window.location.href = url;
      
    } catch (err: any) {
      console.error("Checkout Error:", err);
      alert("Payment failed: " + err.message);
      setIsProcessing(false);
    }
  };

  const lowestAsk = asks[0]?.price || 0;
  const highestBid = bids[0]?.price || 0;
  const spread = lowestAsk > 0 && highestBid > 0 ? lowestAsk - highestBid : 0;
  const spreadPct = lowestAsk > 0 ? (spread / lowestAsk) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden font-mono text-xs shadow-2xl relative">
      
      {/* NEW: Quick-Entry Form Overlay */}
      {showForm.active && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md p-6 flex flex-col justify-center border border-white/10 rounded-xl">
          <h3 className="text-white text-sm font-black mb-4 uppercase tracking-widest italic flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${showForm.type === 'buy' ? 'bg-green-500' : 'bg-red-500'}`} />
            New {showForm.type} Order
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-[8px] text-gray-500 font-bold uppercase mb-1 block">Price per Unit (USD)</label>
              <input 
                type="number" 
                placeholder="0.00" 
                value={orderPrice}
                onChange={(e) => setOrderPrice(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-blue-500 transition-all font-bold"
              />
            </div>
            <div>
              <label className="text-[8px] text-gray-500 font-bold uppercase mb-1 block">Quantity</label>
              <input 
                type="number" 
                placeholder="1" 
                value={orderQty}
                onChange={(e) => setOrderQty(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-blue-500 transition-all font-bold"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button 
              onClick={submitOrder} 
              className={`flex-1 ${showForm.type === 'buy' ? 'bg-green-600' : 'bg-red-600'} text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest`}
            >
              Confirm
            </button>
            <button 
              onClick={() => setShowForm({ ...showForm, active: false })} 
              className="flex-1 bg-white/10 text-gray-400 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
        <span className="font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> 
          LIVE_ORDER_BOOK
        </span>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-gray-500">SPREAD</span>
          <span className={`text-[10px] font-bold ${spread > 0 ? 'text-yellow-500' : 'text-gray-600'}`}>
            ${spread.toFixed(2)} ({spreadPct.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* ASKS (Sells) - Red (Top Half) */}
      <div className="flex-1 overflow-y-auto flex flex-col-reverse justify-end p-2 space-y-1 space-y-reverse custom-scrollbar min-h-[150px]">
        {asks.length === 0 && <div className="text-center text-gray-700 py-10 italic">NO_SELL_OFFERS</div>}
        {asks.map((ask) => (
          <div 
            key={ask.id} 
            className={`flex justify-between items-center p-2 rounded hover:bg-white/5 cursor-pointer relative group transition-all ${userOrders.includes(ask.id) ? 'border border-blue-500/30' : ''}`}
          >
            <div className="absolute right-0 top-0 bottom-0 bg-red-900/10 z-0 transition-all duration-500" style={{ width: `${Math.min(ask.quantity * 10, 100)}%` }} />
            <span className="text-red-400 font-bold z-10 relative">${ask.price.toLocaleString()}</span>
            <span className="text-gray-500 z-10 relative">{ask.quantity}</span>
            <button 
              disabled={isProcessing}
              onClick={(e) => { e.stopPropagation(); handleBuy(ask); }}
              className="opacity-0 group-hover:opacity-100 absolute right-2 bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-lg text-[9px] z-20 font-black transition-all shadow-xl disabled:opacity-50"
            >
              {isProcessing ? <Loader2 size={10} className="animate-spin" /> : 'BUY NOW'}
            </button>
          </div>
        ))}
      </div>

      {/* Current Price Indicator */}
      <div className="py-3 border-y border-white/10 bg-white/5 text-center flex justify-center items-center gap-3">
        <span className="text-xl font-black text-white italic tracking-tighter">${lowestAsk > 0 ? lowestAsk.toLocaleString() : '---'}</span>
        {lowestAsk > highestBid ? <ArrowDown size={14} className="text-red-500" /> : <ArrowUp size={14} className="text-green-500" />}
      </div>

      {/* BIDS (Buys) - Green (Bottom Half) */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar min-h-[150px]">
        {bids.length === 0 && <div className="text-center text-gray-700 py-10 italic">NO_BUY_OFFERS</div>}
        {bids.map((bid) => (
          <div 
            key={bid.id} 
            className={`flex justify-between items-center p-2 rounded hover:bg-white/5 cursor-pointer relative group transition-all ${userOrders.includes(bid.id) ? 'border border-blue-500/30' : ''}`}
          >
            <div className="absolute right-0 top-0 bottom-0 bg-green-900/10 z-0 transition-all duration-500" style={{ width: `${Math.min(bid.quantity * 10, 100)}%` }} />
            <span className="text-green-400 font-bold z-10 relative">${bid.price.toLocaleString()}</span>
            <span className="text-gray-500 z-10 relative">{bid.quantity}</span>
            <button className="opacity-0 group-hover:opacity-100 absolute right-2 bg-red-600 text-white px-3 py-1 rounded-lg text-[9px] z-20 font-black">
              FILL BID
            </button>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-t border-white/10 grid grid-cols-2 gap-3 bg-white/5">
        <button 
          onClick={() => setShowForm({ type: 'buy', active: true })}
          className="bg-green-500/10 border border-green-500/30 text-green-500 py-3 rounded-xl hover:bg-green-500 hover:text-white transition-all font-black flex items-center justify-center gap-2 uppercase tracking-tighter"
        >
          <ShoppingCart size={14} /> Post Bid
        </button>
        <button 
          onClick={() => setShowForm({ type: 'sell', active: true })}
          className="bg-red-500/10 border border-red-500/30 text-red-500 py-3 rounded-xl hover:bg-red-500 hover:text-white transition-all font-black flex items-center justify-center gap-2 uppercase tracking-tighter"
        >
          <Tag size={14} /> List Asset
        </button>
      </div>
    </div>
  );
}
