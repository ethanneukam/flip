import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function PriceAlert({ itemId, currentPrice }: { itemId: string, currentPrice: number }) {
  const [isAlertSet, setIsAlertSet] = useState(false);

  const toggleAlert = async () => {
    // Logic: In Phase 2/Day 11, we just toggle a 'watch' status in Supabase
    setIsAlertSet(!isAlertSet);
    // You would typically save this to a 'user_alerts' table
  };

  return (
    <button 
      onClick={toggleAlert}
      className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all ${
        isAlertSet ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-100 text-gray-400'
      }`}
    >
      {isAlertSet ? <Bell size={16} fill="currentColor" /> : <BellOff size={16} />}
      <span className="text-[10px] font-black uppercase tracking-widest">
        {isAlertSet ? 'Alert Active' : 'Set Volatility Alert'}
      </span>
    </button>
  );
}
