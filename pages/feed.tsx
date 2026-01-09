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
    // 1. Initial Fetch of the feed
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

    // 2. Realtime Subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_events' },
        (payload) => {
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
{/* Integrated Content Card */}
<article key={event.id} className="p-4 md:p-6">
  <div className="bg-[#0A0A0A] rounded-2xl overflow-hidden border border-white/10 hover:border-blue-500/30 transition-all duration-500 shadow-2xl">
    
    {/* Card Header Content */}
    <div className="p-5 md:p-7">
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] bg-blue-500/5 px-2 py-1 rounded">
          STREAM_ORIGIN: @{event.profiles?.username || 'Anonymous'}
        </p>
        
        {event.metadata?.price && (
          <div className="flex flex-col items-end">
            <div className="flex items-center text-green-400 font-mono text-sm font-bold bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20 shadow-[0_0_15px_rgba(74,222,128,0.1)]">
              <ArrowUpRight size={14} className="mr-1" />
              ${Number(event.metadata.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[8px] text-white/20 mt-1 uppercase font-black">Current_Market_Value</span>
          </div>
        )}
      </div>
      
      {/* Title with Typewriter feel */}
      <h3 className="text-lg md:text-xl font-black leading-tight text-white mb-2 tracking-tight">
        {event.message || event.title}
      </h3>
      
      <p className="text-sm text-white/50 leading-relaxed font-medium max-w-2xl border-l border-white/10 pl-4 italic">
        {event.description || `ORACLE_DATA: Analytics synchronized for ${event.metadata?.ticker || 'Global Market'}`}
      </p>
    </div>

    {/* EXPANDED PERFORMANCE CHART SECTION */}
    {event.metadata?.ticker && (
      <div className="border-t border-white/5 bg-black/60">
        <div className="px-6 py-4 flex items-center justify-between bg-white/[0.02]">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] flex items-center">
            <Activity size={12} className="mr-2 text-blue-500" /> 
            LIVE_TELEMETRY // {event.metadata.ticker}
          </span>
          <span className="text-[9px] font-mono text-blue-500/50 animate-pulse">
            CONNECTED_TO_ORACLE_V3
          </span>
        </div>

        {/* INCREASED HEIGHT: From h-28 to h-64 for high visibility */}
        <div className="h-64 md:h-80 w-full p-4 relative">
          {/* Subtle background grid just for the chart area */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          
          <div className="relative h-full w-full transition-all duration-700">
            <MarketChart itemId={event.metadata.item_id} ticker={event.metadata.ticker} />
          </div>
        </div>

        {/* Chart Footer Stats */}
        <div className="px-6 py-3 border-t border-white/5 flex gap-6">
           <div className="flex flex-col">
             <span className="text-[8px] text-white/20 uppercase font-black">Frequency</span>
             <span className="text-[10px] text-white/60 font-mono text-xs">Real-Time</span>
           </div>
           <div className="flex flex-col">
             <span className="text-[8px] text-white/20 uppercase font-black">Data_Integrity</span>
             <span className="text-[10px] text-green-500/60 font-mono text-xs">Verified</span>
           </div>
        </div>
      </div>
    )}
  </div>
</article>
          ))
        ) : (
          <div className="p-20 text-center">
             <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No Pulse Detected</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
