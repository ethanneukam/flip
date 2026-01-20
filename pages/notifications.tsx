import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Head from "next/head";
import { Bell, Clock, Trash2, ArrowLeft, RefreshCw, Terminal as TerminalIcon } from "lucide-react";
import { useRouter } from "next/router";

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchNotifications = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/auth");

    // Fetch high-importance events or price updates
    const { data, error } = await supabase
      .from("feed_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setNotifications(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white font-sans">
      <Head><title>Terminal_Logs | Flip</title></Head>

      {/* Header */}
      <header className="border-b border-white/10 p-6 flex justify-between items-center bg-[#0B0E11]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter">System_Logs</h1>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Incoming Data Streams</p>
          </div>
        </div>
        
        <button 
          onClick={fetchNotifications}
          className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-blue-500 transition-all"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <TerminalIcon size={48} className="animate-pulse mb-4" />
            <p className="font-mono text-xs uppercase tracking-[0.3em]">Decoding_Buffer...</p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className="group bg-white/[0.02] border border-white/5 hover:border-blue-500/30 p-4 rounded-xl transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${notif.event_type === 'PRICE_UPDATE' ? 'bg-green-500' : 'bg-blue-500'}`} />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                      {notif.event_type}
                    </span>
                  </div>
                  <div className="flex items-center text-[10px] font-mono text-white/20">
                    <Clock size={10} className="mr-1" />
                    {new Date(notif.created_at).toLocaleString()}
                  </div>
                </div>
                
                <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                  {notif.message}
                </p>

                {notif.metadata?.price && (
                  <div className="mt-3 inline-flex items-center gap-2 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-[10px] font-mono text-green-400">
                    <span>VALUE_LOCKED:</span>
                    <span className="font-bold">${notif.metadata.price.toLocaleString()}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
            <p className="text-xs font-mono text-white/20 uppercase tracking-widest">No Recent Logs Found</p>
          </div>
        )}
      </main>
    </div>
  );
}
