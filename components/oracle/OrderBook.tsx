import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { ArrowDown, ArrowUp, ShoppingCart, Tag, Loader2, Lock } from 'lucide-react';
import { useRouter } from 'next/router';
import AddressModal from '../../components/AddressModal';

interface Order {
  id: string;
  price: number;
  quantity: number;
  user_id: string;
  ticker: string;
}

export default function OrderBook({ ticker }: { ticker: string }) {
  const router = useRouter();
  const [bids, setBids] = useState<Order[]>([]);
  const [asks, setAsks] = useState<Order[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const [showForm, setShowForm] = useState<{type: 'buy' | 'sell', active: boolean}>({type: 'buy', active: false});
  const [orderPrice, setOrderPrice] = useState('');
  const [orderQty, setOrderQty] = useState('1');

  useEffect(() => {
    if (!ticker) return;
    fetchBook();
    
    const subscription = supabase
      .channel(`order_book_${ticker}`)
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
    const { data: askData } = await supabase
      .from('market_orders')
      .select('*')
      .eq('ticker', ticker)
      .eq('order_type', 'sell')
      .eq('status', 'open')
      .order('price', { ascending: true });

    const { data: bidData } = await supabase
      .from('market_orders')
      .select('*')
      .eq('ticker', ticker)
      .eq('order_type', 'buy')
      .eq('status', 'open')
      .order('price', { ascending: false });

    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    setAsks(askData || []);
    setBids(bidData || []);
  };

  const checkAddressAndProceed = async (type: 'buy' | 'sell', order?: Order) => {
    if (!currentUserId) return alert("AUTH_REQUIRED: Please login.");

    if (order && order.user_id === currentUserId) {
      alert("INVALID_ACTION: You cannot trade against your own order.");
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('address_line1')
      .eq('id', currentUserId)
      .single();

    if (!profile?.address_line1) {
      setIsAddressModalOpen(true);
      return;
    }

    if (order) {
      handleBuy(order);
    } else {
      setShowForm({ type, active: true });
    }
  };

  const submitOrder = async () => {
    if (!currentUserId) return;

    if (showForm.type === 'sell') {
      const { data: ownership } = await supabase
        .from('items')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('ticker', ticker)
        .limit(1);

      if (!ownership?.length) {
        alert("VAULT_ERROR: Asset not found in your inventory.");
        return;
      }
    }

    const { error } = await supabase.from('market_orders').insert({
      ticker,
      order_type: showForm.type,
      price: parseFloat(orderPrice),
      quantity: parseInt(orderQty),
      user_id: currentUserId,
      status: 'open'
    });

    if (error) alert(error.message);
    else {
      setShowForm({ ...showForm, active: false });
      setOrderPrice('');
      fetchBook();
    }
  };

  const handleBuy = async (order: Order) => {
    setIsProcessing(true);
    try {
      // 1. Optimistic Lock: Mark as pending so no double-buys
      const { error: lockError } = await supabase
        .from('market_orders')
        .update({ status: 'pending' })
        .eq('id', order.id)
        .eq('status', 'open');

      if (lockError) throw new Error("This order is no longer available.");

      // 2. Create Checkout Session
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          price: order.price,
          ticker: ticker,
          buyerId: currentUserId,
          sellerId: order.user_id
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
      
    } catch (err: any) {
      alert("TRANSACTION_FAILED: " + err.message);
      setIsProcessing(false);
      // Reset status to open if it failed
      await supabase.from('market_orders').update({ status: 'open' }).eq('id', order.id);
      fetchBook();
    }
  };

  const lowestAsk = asks[0]?.price || 0;
  const highestBid = bids[0]?.price || 0;

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden font-mono text-[10px] shadow-2xl relative">
      
      {showForm.active && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md p-6 flex flex-col justify-center border border-white/10 rounded-xl">
          <h3 className="text-white text-xs font-black mb-4 uppercase tracking-[0.2em] italic flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${showForm.type === 'buy' ? 'bg-green-500' : 'bg-red-500'}`} />
            NEW_{showForm.type.toUpperCase()}_ORDER
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[8px] text-gray-500 font-bold uppercase mb-1 block">Limit_Price (USD)</label>
              <input 
                type="number" 
                value={orderPrice}
                onChange={(e) => setOrderPrice(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-blue-500 font-bold"
              />
            </div>
            <div>
              <label className="text-[8px] text-gray-500 font-bold uppercase mb-1 block">Quantity_Units</label>
              <input 
                type="number" 
                value={orderQty}
                onChange={(e) => setOrderQty(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-blue-500 font-bold"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-8">
            <button onClick={submitOrder} className={`flex-1 ${showForm.type === 'buy' ? 'bg-green-600' : 'bg-red-600'} text-white py-3 rounded-lg font-black uppercase tracking-widest`}>Confirm</button>
            <button onClick={() => setShowForm({ ...showForm, active: false })} className="flex-1 bg-white/10 text-gray-400 py-3 rounded-lg font-black uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      )}

      {/* ASKS SECTION */}
      <div className="flex-1 overflow-y-auto flex flex-col-reverse justify-end p-2 space-y-1 space-y-reverse custom-scrollbar">
        {asks.map((ask) => (
          <div key={ask.id} className="flex justify-between items-center p-2 rounded hover:bg-white/5 group relative">
            <span className="text-red-400 font-bold">${ask.price.toLocaleString()}</span>
            <span className="text-gray-500">{ask.quantity}</span>
            {ask.user_id === currentUserId ? (
              <div className="absolute right-2 bg-white/10 text-gray-400 px-2 py-1 rounded text-[8px] font-bold flex items-center gap-1">
                <Lock size={10} /> YOUR_ORDER
              </div>
            ) : (
              <button 
                onClick={() => checkAddressAndProceed('buy', ask)}
                disabled={isProcessing}
                className="opacity-0 group-hover:opacity-100 absolute right-2 bg-green-600 text-white px-3 py-1 rounded text-[8px] font-black transition-all"
              >
                {isProcessing ? <Loader2 size={10} className="animate-spin" /> : 'BUY_NOW'}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="py-2 border-y border-white/10 bg-white/5 text-center">
        <span className="text-lg font-black text-white italic tracking-tighter">${lowestAsk || '---'}</span>
      </div>

      {/* BIDS SECTION */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {bids.map((bid) => (
          <div key={bid.id} className="flex justify-between items-center p-2 rounded hover:bg-white/5 group relative">
            <span className="text-green-400 font-bold">${bid.price.toLocaleString()}</span>
            <span className="text-gray-500">{bid.quantity}</span>
            {bid.user_id === currentUserId ? (
              <div className="absolute right-2 bg-white/10 text-gray-400 px-2 py-1 rounded text-[8px] font-bold flex items-center gap-1">
                <Lock size={10} /> YOUR_ORDER
              </div>
            ) : (
              <button 
                onClick={() => checkAddressAndProceed('buy', bid)}
                disabled={isProcessing}
                className="opacity-0 group-hover:opacity-100 absolute right-2 bg-red-600 text-white px-3 py-1 rounded text-[8px] font-black transition-all"
              >
                {isProcessing ? <Loader2 size={10} className="animate-spin" /> : 'FILL_BID'}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/10 grid grid-cols-2 gap-2">
        <button onClick={() => checkAddressAndProceed('buy')} className="bg-green-500/10 border border-green-500/30 text-green-500 py-3 rounded-lg font-black uppercase">Post Bid</button>
        <button onClick={() => checkAddressAndProceed('sell')} className="bg-red-500/10 border border-red-500/30 text-red-500 py-3 rounded-lg font-black uppercase">List Asset</button>
      </div>

      <AddressModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} onSave={fetchBook} />
    </div>
  );
}