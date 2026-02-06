import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Globe, ArrowUpRight, Ship, Percent } from 'lucide-react';

export default function ArbitrageRadar() {
  const [deals, setDeals] = useState<any[]>([]);

  useEffect(() => {
    const fetchArbitrage = async () => {
      const { data } = await supabase.from('global_arbitrage').select('*').limit(5);
      if (data) setDeals(data);
    };
    fetchArbitrage();
    
    // Real-time subscription to price updates
    const channel = supabase.channel('price-changes')
      .on('postgres_changes', { event: 'INSERT', table: 'price_logs' }, () => fetchArbitrage())
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="p-6 bg-black text-green-400 font-mono border-4 border-green-900 rounded-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black uppercase flex items-center gap-2">
          <Globe className="animate-spin-slow" /> Global Arbitrage Radar
        </h2>
        <span className="bg-green-900 text-green-200 px-3 py-1 text-xs animate-pulse">LIVE NODES: 5</span>
      </div>

      <div className="space-y-4">
        {deals.map((deal, i) => (
          <div key={i} className="border-2 border-green-800 p-4 hover:bg-green-950 transition-all group">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-green-600">{deal.ticker}</span>
                <h3 className="text-lg font-bold text-white uppercase">{deal.title}</h3>
              </div>
              <div className="text-right">
                <span className="text-xs block text-green-600 uppercase">Net Profit</span>
                <span className="text-xl font-black text-green-400">+${deal.net_arbitrage_profit.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 mt-4 pt-4 border-t border-green-900 text-[10px] uppercase tracking-widest">
              <div className="flex flex-col">
                <span className="text-gray-500">Origin</span>
                <span className="text-white flex items-center gap-1">{deal.region} <Globe size={10}/></span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500">Landed Cost</span>
                <span className="text-yellow-500 flex items-center gap-1">${deal.price_usd.toFixed(2)} <Ship size={10}/></span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500">US Market</span>
                <span className="text-white">${deal.local_avg_usd.toFixed(2)}</span>
              </div>
            </div>
            
            <button className="w-full mt-4 bg-green-500 text-black font-black py-2 group-hover:bg-white transition-colors flex items-center justify-center gap-2">
              EXECUTE GLOBAL TRADE <ArrowUpRight size={16}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
