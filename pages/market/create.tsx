import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function CreateOrder() {
  const router = useRouter();
  const { type, ticker } = router.query;
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('market_orders').insert({
      ticker: ticker,
      order_type: type, // 'buy' or 'sell'
      price: parseFloat(price),
      quantity: parseInt(qty),
      user_id: user?.id,
      status: 'open'
    });

    if (!error) router.push(`/market/${ticker}`);
    else alert(error.message);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-black min-h-screen text-white">
      <h1 className="text-2xl font-black italic mb-6 uppercase">
        {type === 'buy' ? 'Post a Bid' : 'List Asset'} for {ticker}
      </h1>
      
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase">Price (USD)</label>
          <input 
            type="number" 
            value={price} 
            onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl font-mono text-xl"
            placeholder="0.00"
          />
        </div>
        
        <button 
          onClick={handleSubmit}
          className="w-full bg-blue-600 py-4 rounded-2xl font-black uppercase tracking-widest mt-4"
        >
          Confirm {type === 'buy' ? 'Bid' : 'Listing'}
        </button>
      </div>
    </div>
  );
}
