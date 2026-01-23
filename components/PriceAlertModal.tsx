import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Bell, X, Target, Zap } from "lucide-react";

export function PriceAlertModal({ item, onClose }: { item: any, onClose: () => void }) {
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("below");
  const [loading, setLoading] = useState(false);

  const saveAlert = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Auth Required");

    const { error } = await supabase.from("price_alerts").insert([{
      user_id: user.id,
      item_id: item.id,
      target_price: parseFloat(targetPrice),
      condition: condition
    }]);

    if (!error) {
      onClose();
    } else {
      console.error(error);
      alert("Terminal Error: Alert could not be registered.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0B0E11] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-blue-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/70">Set_Price_Target</h3>
          </div>
          <button onClick={onClose} className="text-white/20 hover:text-white"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <p className="text-[10px] font-mono text-white/30 uppercase mb-1">{item.ticker}</p>
            <h4 className="text-lg font-bold text-white italic truncate">{item.title}</h4>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-mono text-white/20 uppercase mb-2 block">Trigger Condition</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setCondition("below")}
                  className={`py-2 text-[10px] font-black rounded border transition-all ${condition === 'below' ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-white/5 border-white/10 text-white/40'}`}
                >
                  PRICE DROPS TO
                </button>
                <button 
                  onClick={() => setCondition("above")}
                  className={`py-2 text-[10px] font-black rounded border transition-all ${condition === 'above' ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-white/5 border-white/10 text-white/40'}`}
                >
                  PRICE RISES TO
                </button>
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 font-mono">$</span>
              <input 
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-8 pr-4 text-white font-mono focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <button 
            onClick={saveAlert}
            disabled={!targetPrice || loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? "Syncing..." : <><Target size={14} /> Arm Alert</>}
          </button>
        </div>
      </div>
    </div>
  );
}
