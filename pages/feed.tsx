import { useEffect, useState } from "react";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/components/BottomNav";
import { Zap, ShieldCheck, Clock, Activity, ArrowUpRight } from "lucide-react";
import MarketChart from "@/components/oracle/MarketChart";

export default function PulseFeed() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      const { data, error } = await supabase
        .from("feed_events")
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) console.error("Pulse Error:", error.message);
      if (data) setEvents(data);
      setLoading(false);
    };
    fetchFeed();
  }, []);

  return (
    <div className="min-h-screen bg-black pb-32">
      <Head><title>Pulse | Flip</title></Head>

      <header className="p-4 border-b border-white/10 sticky top-0 bg-black/80 backdrop-blur-md z-50 flex justify-between items-center">
        <h1 className="text-xl font-black italic tracking-tighter uppercase text-white">The Pulse</h1>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Live</span>
        </div>
      </header>

      <main className="divide-y divide-white/5">
        {loading ? (
          <div className="p-10 text-center text-xs font-bold text-white/20 animate-pulse uppercase tracking-widest">
            Syncing Global Pulse...
          </div>
        ) : events.length > 0 ? (
          events.map((event) => (
            <article key={event.id} className="p-4 space-y-3">
              {/* Event Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${event.event_type === 'VAULT_ADD' ? 'bg-blue-600' : 'bg-white/10'}`}>
                    {event.event_type === 'VAULT_ADD' ? <ShieldCheck size={12} className="text-white" /> : <Zap size={12} className="text-yellow-400" />}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-white">
                    {event.event_type === 'VAULT_ADD' ? 'Vault Entry' : 'Oracle Alert'}
                  </span>
                </div>
                <div className="flex items-center text-[10px] font-bold text-white/30 uppercase">
                  <Clock size={10} className="mr-1" />
                  {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Content Card */}
              <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-colors">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] font-black text-blue-500 uppercase">
                        AGENT: @{event.profiles?.username || 'Anonymous'}
                      </p>
                      {/* Current Price Display */}
                      {event.metadata?.price && (
                        <div className="flex items-center text-green-400 font-mono text-xs font-bold bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                          <ArrowUpRight size={10} className="mr-0.5" />
                          ${Number(event.metadata.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-bold leading-tight text-white">{event.message || event.title}</h3>
                    <p className="text-[11px] text-white/50 mt-1">{event.description || `Activity detected in ${event.metadata?.ticker || 'Market'}`}</p>
                  </div>
                </div>

                {/* Performance Chart if Ticker exists */}
                {event.metadata?.ticker && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-widest flex items-center">
                        <Activity size={10} className="mr-1" /> Market Performance
                      </span>
                    </div>
                    <div className="h-24 w-full opacity-60 grayscale hover:grayscale-0 transition-all">
                      <MarketChart itemId={event.metadata.item_id} ticker={event.metadata.ticker} />
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="p-20 text-center">
             <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No Pulse Detected</p>
             <p className="text-[10px] text-white/10 mt-2 italic font-mono">IDLE_STATE_ACTIVE</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
