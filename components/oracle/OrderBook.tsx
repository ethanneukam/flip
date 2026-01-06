import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { ArrowDown, ArrowUp, ShoppingCart, Tag } from 'lucide-react';

interface Order {
  id: string;
  price: number;
  quantity: number;
  user_id: string;
}

export default function OrderBook({ ticker }: { ticker: string }) {
  const [bids, setBids] = useState<Order[]>([]); // Buy Orders (Green)
  const [asks, setAsks] = useState<Order[]>([]); // Sell Orders (Red)
  const [userOrders, setUserOrders] = useState<string[]>([]); // To highlight my own orders

  useEffect(() => {
    if (!ticker) return;
    fetchBook();
    
    // Subscribe to live changes
    const subscription = supabase
      .channel('order_book_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_orders', filter: `ticker=eq.${ticker}` }, 
      () => fetchBook())
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

    const { data: userData } = await supabase.auth.getUser();

    setAsks(askData || []);
    setBids(bidData || []);
    if (userData.user) checkUserOrders(userData.user.id);
  };

  const checkUserOrders = async (userId: string) => {
    const { data } = await supabase.from('market_orders').select('id').eq('user_id', userId);
    if (data) setUserOrders(data.map(o => o.id));
  };

  // Calculate Spread
  const lowestAsk = asks[0]?.price || 0;
  const highestBid = bids[0]?.price || 0;
  const spread = lowestAsk > 0 && highestBid > 0 ? lowestAsk - highestBid : 0;
  const spreadPct = lowestAsk > 0 ? (spread / lowestAsk) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden font-mono text-xs">
      
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
        <span className="font-bold text-gray-400 uppercase tracking-widest">Order_Book_L2</span>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-gray-500">SPREAD</span>
          <span className={`text-[10px] font-bold ${spread > 0 ? 'text-yellow-500' : 'text-gray-600'}`}>
            ${spread.toFixed(2)} ({spreadPct.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* ASKS (Sells) - Red (Top Half) */}
      <div className="flex-1 overflow-y-auto flex flex-col-reverse justify-end p-2 space-y-1 space-y-reverse custom-scrollbar">
        {asks.length === 0 && <div className="text-center text-gray-700 py-4">NO_SELLERS</div>}
        {asks.map((ask) => (
          <div key={ask.id} className={`flex justify-between items-center p-1 rounded hover:bg-white/5 cursor-pointer relative group ${userOrders.includes(ask.id) ? 'border border-blue-500/30' : ''}`}>
             {/* Depth Bar Visual */}
            <div className="absolute right-0 top-0 bottom-0 bg-red-900/20 z-0 transition-all duration-500" style={{ width: `${Math.min(ask.quantity * 10, 100)}%` }} />
            
            <span className="text-red-400 font-bold z-10 relative">${ask.price.toLocaleString()}</span>
            <span className="text-gray-500 z-10 relative">{ask.quantity}</span>
            <button className="opacity-0 group-hover:opacity-100 absolute right-2 bg-green-600 text-white px-2 rounded text-[9px] z-20">BUY</button>
          </div>
        ))}
      </div>

      {/* Current Price Indicator */}
      <div className="py-2 border-y border-white/10 bg-white/5 text-center flex justify-center items-center gap-2">
        <span className="text-lg font-black text-white">${lowestAsk > 0 ? lowestAsk.toLocaleString() : '---'}</span>
        {lowestAsk > highestBid ? <ArrowDown size={12} className="text-red-500" /> : <ArrowUp size={12} className="text-green-500" />}
      </div>

      {/* BIDS (Buys) - Green (Bottom Half) */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {bids.length === 0 && <div className="text-center text-gray-700 py-4">NO_BUYERS</div>}
        {bids.map((bid) => (
          <div key={bid.id} className={`flex justify-between items-center p-1 rounded hover:bg-white/5 cursor-pointer relative group ${userOrders.includes(bid.id) ? 'border border-blue-500/30' : ''}`}>
            {/* Depth Bar Visual */}
            <div className="absolute right-0 top-0 bottom-0 bg-green-900/20 z-0 transition-all duration-500" style={{ width: `${Math.min(bid.quantity * 10, 100)}%` }} />
            
            <span className="text-green-400 font-bold z-10 relative">${bid.price.toLocaleString()}</span>
            <span className="text-gray-500 z-10 relative">{bid.quantity}</span>
            <button className="opacity-0 group-hover:opacity-100 absolute right-2 bg-red-600 text-white px-2 rounded text-[9px] z-20">SELL</button>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="p-2 border-t border-white/10 grid grid-cols-2 gap-2">
        <button className="bg-green-500/10 border border-green-500/50 text-green-500 py-2 rounded hover:bg-green-500 hover:text-white transition-all font-bold flex items-center justify-center gap-1">
          <ShoppingCart size={12} /> BID
        </button>
        <button className="bg-red-500/10 border border-red-500/50 text-red-500 py-2 rounded hover:bg-red-500 hover:text-white transition-all font-bold flex items-center justify-center gap-1">
          <Tag size={12} /> ASK
        </button>
      </div>
    </div>
  );
}
