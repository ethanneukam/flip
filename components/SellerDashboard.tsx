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

  const [isLabelLoading, setIsLabelLoading] = useState<string | null>(null);

const handleGenerateLabel = async (txId: string) => {
  setIsLabelLoading(txId);
  try {
    const res = await fetch('/api/shipping/create-label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: txId })
    });
    
    const data = await res.json();
    if (data.url) {
      window.open(data.url, '_blank'); // Opens the PDF shipping label
      await fetchSales(); // Refresh to show "Shipped" status
    } else {
      throw new Error(data.error || "Failed to generate label");
    }
  } catch (err: any) {
    alert("Shipping Error: " + err.message);
  } finally {
    setIsLabelLoading(null);
  }
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

        <button 
  onClick={() => handleGenerateLabel(tx.id)}
  disabled={!!isLabelLoading}
  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex justify-center items-center shadow-[0_0_20px_rgba(37,99,235,0.3)]"
>
  {isLabelLoading === tx.id ? <Loader2 className="animate-spin" /> : "Generate Shippo Label (Prepaid)"}
</button>

<div className="relative py-2 flex items-center">
    <div className="flex-grow border-t border-gray-200"></div>
    <span className="flex-shrink mx-4 text-[8px] text-gray-400 font-bold uppercase">OR MANUAL ENTRY</span>
    <div className="flex-grow border-t border-gray-200"></div>
</div>
{/* Keep your manual input fields below this for fallback */}
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
          )
        </div>
      ))}
    </div>
  );
}
