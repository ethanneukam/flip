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
      .select(`*, profiles:user_id (username, avatar_url)`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) setEvents(data);
    setLoading(false);
  };

  fetchFeed();

  // Fix: Listen to ALL events and manually refresh or prepend
  const channel = supabase
    .channel('pulse-live')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'feed_events' },
      async (payload) => {
        // Since realtime payloads don't include Joined tables (profiles), 
        // we do a quick fetch for the specific new row
        const { data: newRow } = await supabase
          .from("feed_events")
          .select(`*, profiles:user_id (username, avatar_url)`)
          .eq('id', payload.new.id)
          .single();
        
        if (newRow) {
          setEvents((prev) => [newRow, ...prev].slice(0, 20));
        }
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
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
            <article key={event.id} className="p-4">
              {/* Event Metadata */}
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center space-x-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${event.event_type === 'VAULT_ADD' ? 'bg-blue-600' : 'bg-white/10'}`}>
                    {event.event_type === 'VAULT_ADD' ? <ShieldCheck size={10} className="text-white" /> : <Zap size={10} className="text-yellow-400" />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/60">
                    {event.event_type === 'VAULT_ADD' ? 'Vault_Entry' : 'Oracle_Alert'}
                  </span>
                </div>
                <div className="flex items-center text-[9px] font-bold text-white/30 uppercase tracking-tighter font-mono">
                  <Clock size={8} className="mr-1" />
                  {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
{/* Massive Content Card */}
              <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 group-hover:border-blue-500/50 transition-all duration-500 shadow-2xl">
                
                {/* Header Section */}
                <div className="p-6 md:p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                        AGENT: @{event.profiles?.username || 'Anonymous'}
                      </p>
                      <h3 className="text-xl md:text-2xl font-black text-white leading-none tracking-tighter">
                        {event.message || event.title}
                      </h3>
                    </div>

                    {event.metadata?.price && (
                      <div className="text-right">
                        <div className="flex items-center text-green-400 font-mono text-lg font-bold bg-green-400/10 px-4 py-1 rounded-lg border border-green-400/20 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                          <ArrowUpRight size={18} className="mr-1" />
                          ${Number(event.metadata.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[9px] text-white/20 uppercase font-black block mt-1 tracking-tighter">Live_Market_Rate</span>
                      </div>
                    )}
                  </div>

                  <p className="text-sm md:text-base text-white/50 leading-relaxed font-medium max-w-2xl border-l-2 border-white/10 pl-6 italic">
                    {event.description || `ORACLE_DATA: Analytics synchronized for ${event.metadata?.ticker || 'Global Market'}`}
                  </p>
                </div>

                {/* EXPANDED PERFORMANCE CHART */}
                {event.metadata?.ticker && (
                  <div className="border-t border-white/5 bg-black/40">
                    <div className="px-6 py-4 flex items-center justify-between bg-white/[0.01]">
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] flex items-center">
                        <Activity size={14} className="mr-2 text-blue-500" /> 
                        TELEMETRY: {event.metadata.ticker}
                      </span>
                      <div className="flex space-x-4 text-[9px] font-mono text-white/20">
                        <span>DATA_STREAMS: 4</span>
                        <span>STABILITY: 99.8%</span>
                      </div>
                    </div>

                    {/* Chart Container - Massive Visibility */}
                    <div className="h-72 md:h-96 w-full p-6 relative">
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                      
                      <div className="relative h-full w-full">
                        <MarketChart itemId={event.metadata.item_id} ticker={event.metadata.ticker} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="p-20 text-center border border-dashed border-white/10 rounded-3xl">
             <p className="text-xs font-bold text-white/20 uppercase tracking-[1em]">Scanning Atmosphere...</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
