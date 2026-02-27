import { useState, useEffect } from "react";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/components/BottomNav";
import { Box, Truck, ShieldCheck, Search, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function OpsCenter() {
  const [activeTab, setActiveTab] = useState<'buying' | 'selling'>('buying');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const column = activeTab === 'buying' ? 'buyer_id' : 'seller_id';

    const { data, error } = await supabase
      .from('escrow_transactions')
      .select(`
        *,
        items:item_id (title, image_url, sku),
        seller:seller_id (username),
        buyer:buyer_id (username)
      `)
      .eq(column, user.id)
      .order('created_at', { ascending: false });

    if (data) setOrders(data);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'text-green-500';
      case 'authenticating': return 'text-blue-500';
      case 'in_transit': return 'text-yellow-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-32 font-mono">
      <Head><title>OPS_CENTER | PIVOT</title></Head>

      <header className="p-6 border-b border-white/5 sticky top-0 bg-black/80 backdrop-blur-md z-50">
        <h1 className="text-2xl font-black italic tracking-tighter uppercase mb-4">Operations</h1>
        
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
          {(['buying', 'selling'] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}
            >
              {tab === 'buying' ? 'Acquisitions' : 'Dispatches'}
            </button>
          ))}
        </div>
      </header>

      <main className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <Loader2 className="animate-spin mb-2" size={24} />
            <span className="text-[10px] font-black uppercase tracking-widest">Accessing_Datastream...</span>
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                key={order.id} 
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
              >
                <div className="p-4 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse bg-current ${getStatusColor(order.status)}`} />
                    <span className={`text-[9px] font-black uppercase ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-[8px] text-white/20 font-bold uppercase tracking-widest">
                    ID: {order.id.split('-')[0]}
                  </span>
                </div>

                <div className="p-4 flex gap-4">
                  <img src={order.items?.image_url} className="w-16 h-16 bg-white/10 rounded-xl object-cover border border-white/5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-black uppercase truncate">{order.items?.title}</h3>
                    <p className="text-[9px] text-white/40 mt-1">
                      {activeTab === 'buying' ? `FROM: @${order.seller?.username}` : `TO: @${order.buyer?.username}`}
                    </p>
                    <div className="mt-3 flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <div key={s} className={`h-1 flex-1 rounded-full ${s <= 2 ? 'bg-blue-500' : 'bg-white/5'}`} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4 flex gap-2">
                  <button className="flex-1 bg-white/5 border border-white/10 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-white/10">
                    Track_Intel
                  </button>
                  {activeTab === 'selling' && order.status === 'awaiting_shipment' && (
                    <button className="flex-1 bg-blue-600 py-2.5 rounded-xl text-[9px] font-black uppercase shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                      Print_Label
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center opacity-20 text-center">
            <Box size={40} strokeWidth={1} className="mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No_Active_Operations</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}