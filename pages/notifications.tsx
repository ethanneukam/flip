import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Head from "next/head";
import { Bell, Clock, ArrowLeft, RefreshCw, ChevronRight } from "lucide-react";
import { useRouter } from "next/router";

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchNotifications = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/auth");

    const { data } = await supabase
      .from("feed_events")
      .select(`
        *,
        items (title, ticker)
      `)
      .order("created_at", { ascending: false })
      .limit(40);

    if (data) setNotifications(data);
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleNotificationClick = (item: any) => {
    if (item?.ticker) {
      // Navigates to the chart page with the specific ticker
      router.push(`/chart?ticker=${item.ticker}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-24">
      <header className="border-b border-white/10 p-6 flex justify-between items-center bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-full text-white/40"><ArrowLeft size={20} /></button>
          <h1 className="text-xl font-black italic uppercase tracking-tighter">Terminal_Logs</h1>
        </div>
        <button onClick={fetchNotifications} className="text-white/20 hover:text-blue-500"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-3">
        {notifications.map((notif) => (
          <div 
            key={notif.id} 
            onClick={() => handleNotificationClick(notif.items)}
            className="group relative bg-[#0B0E11] border border-white/5 p-4 rounded-xl cursor-pointer hover:border-blue-500/50 transition-all active:scale-[0.98]"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${notif.event_type === 'PRICE_UPDATE' ? 'bg-green-500' : 'bg-blue-500'}`} />
                  <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{notif.items?.ticker || 'SYSTEM'}</p>
                </div>
                <p className="text-sm font-bold text-white/90">{notif.message}</p>
              </div>
              <ChevronRight size={14} className="text-white/10 group-hover:text-blue-500 transition-colors" />
            </div>
            <div className="mt-3 flex items-center justify-between opacity-30 group-hover:opacity-100 transition-opacity">
               <span className="text-[9px] font-mono">{new Date(notif.created_at).toLocaleTimeString()}</span>
               <span className="text-[9px] font-black uppercase text-blue-500">View Chart →</span>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
