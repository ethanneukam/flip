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
// 2. Realtime Subscription (The "Live" Pulse)
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_events' },
        (payload) => {
          // Add the new event to the top of the list
          setEvents((prev) => [payload.new, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

           {/* Integrated Content Card */}
              <div className="bg-white/[0.03] rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">
                      AGENT: @{event.profiles?.username || 'Anonymous'}
                    </p>
                    {event.metadata?.price && (
                      <div className="flex items-center text-green-400 font-mono text-[10px] font-bold bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">
                        <ArrowUpRight size={10} className="mr-0.5" />
                        ${Number(event.metadata.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-sm font-bold leading-tight text-white mb-1">
                    {event.message || event.title}
                  </h3>
                  <p className="text-[11px] text-white/40 leading-relaxed italic">
                    {event.description || `Data stream active for ticker: ${event.metadata?.ticker || 'N/A'}`}
                  </p>
                </div>

                {/* Integrated Performance Chart */}
                {event.metadata?.ticker && (
                  <div className="border-t border-white/5 bg-black/40">
                    <div className="px-4 pt-3 flex items-center justify-between">
                      <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center">
                        <Activity size={8} className="mr-1" /> Market_Telemetry
                      </span>
                      <span className="text-[8px] font-mono text-white/20 uppercase">
                        {event.metadata.ticker} // STAT_ID: {event.metadata.item_id?.slice(0,8)}
                      </span>
                    </div>
                    {/* Fixed Height Container to prevent overlap */}
                    <div className="h-28 w-full p-2 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
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
             <p className="text-[10px] text-white/10 mt-2 italic font-mono uppercase tracking-tighter">System_Idle_Waiting_For_Oracle</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
