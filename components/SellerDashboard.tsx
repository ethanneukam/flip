import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Truck, PackageCheck, AlertCircle, Loader2 } from "lucide-react";

export default function SellerDashboard({ userId }: { userId: string }) {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (userId) fetchSales();
  }, [userId]);

  const fetchSales = async () => {
    setLoading(true);
    // Fetch transactions where the user is the SELLER
    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        items (title, image_url)
      `)
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });
    
    if (error) console.error("Error fetching sales:", error.message);
    if (data) setSales(data);
    setLoading(false);
  };

  const handleUpdateTracking = async (txId: string) => {
    const carrier = (document.getElementById(`carrier-${txId}`) as HTMLInputElement).value;
    const tracking = (document.getElementById(`track-${txId}`) as HTMLInputElement).value;

    if (!carrier || !tracking) return alert("Please enter both carrier and tracking number");

    setUpdatingId(txId);
    const { error } = await supabase
      .from("transactions")
      .update({ 
        status: 'shipped', 
        shipping_carrier: carrier,
        tracking_number: tracking,
        updated_at: new Date().toISOString()
      })
      .eq("id", txId);

    if (error) {
      alert("Error updating tracking: " + error.message);
    } else {
      await fetchSales(); // Refresh list
    }
    setUpdatingId(null);
  };

  if (loading) return (
    <div className="flex justify-center py-10">
      <Loader2 className="animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="space-y-4 pb-10">
      <div className="flex justify-between items-center px-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Order Fulfillment</h3>
        <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full">
          {sales.length} SALES
        </span>
      </div>
      
      {sales.length === 0 && (
        <div className="bg-white p-12 rounded-[32px] text-center border border-dashed border-gray-200">
          <p className="text-gray-400 text-xs font-bold italic">Your sales floor is empty.</p>
        </div>
      )}

      {sales.map((tx) => (
        <div key={tx.id} className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm overflow-hidden relative">
          {/* Status Badge */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-3">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-50">
                <img src={tx.items?.image_url} className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight mb-1">{tx.items?.title}</h4>
                <p className="text-[10px] font-mono text-gray-400">TX: {tx.id.substring(0,8)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-sm italic">${tx.amount.toLocaleString()}</p>
              <p className="text-[8px] font-bold text-gray-400 uppercase">Payout Pending</p>
            </div>
          </div>

          {tx.status === 'escrow_locked' ? (
            <div className="space-y-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
              <div className="flex items-center gap-2 text-[9px] font-black text-blue-700 uppercase">
                <AlertCircle size={14} /> Funds Secured in Escrow
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text" 
                  placeholder="Carrier (e.g. UPS)" 
                  className="bg-white border border-blue-100 rounded-xl p-3 text-[10px] font-bold focus:ring-2 ring-blue-500 outline-none"
                  id={`carrier-${tx.id}`}
                />
                <input 
                  type="text" 
                  placeholder="Tracking #" 
                  className="bg-white border border-blue-100 rounded-xl p-3 text-[10px] font-bold focus:ring-2 ring-blue-500 outline-none"
                  id={`track-${tx.id}`}
                />
              </div>
              <button 
                disabled={updatingId === tx.id}
                onClick={() => handleUpdateTracking(tx.id)}
                className="w-full bg-black text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex justify-center items-center"
              >
                {updatingId === tx.id ? <Loader2 className="animate-spin" size={16} /> : "Submit Tracking & Ship"}
              </button>
            </div>
          ) : (
            <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="bg-green-500 text-white p-2 rounded-lg"><Truck size={16} /></div>
                 <div>
                    <p className="text-[9px] font-black text-green-700 uppercase">Package Shipped</p>
                    <p className="text-[10px] font-bold text-green-900">{tx.shipping_carrier}: {tx.tracking_number}</p>
                 </div>
               </div>
               <PackageCheck size={20} className="text-green-300" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
