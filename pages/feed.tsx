import { useEffect, useState } from "react";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/components/BottomNav";
import { Zap, ShieldCheck, Clock, Activity, ArrowUpRight } from "lucide-react";
import MarketChart from "@/components/oracle/MarketChart";
import { useRouter } from "next/router";

export default function PulseFeed() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
const router = useRouter();
  useEffect(() => {
    const fetchFeed = async () => {
      // Fetch the initial 20 events
      const { data, error } = await supabase
        .from("feed_events")
        .select(`*, profiles:user_id (username, avatar_url)`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) setEvents(data);
      setLoading(false);
    };

    fetchFeed();

    // Subscribe to LIVE updates
    const channel = supabase
      .channel('pulse-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_events' },
        async (payload) => {
          console.log("⚡ New Pulse Event:", payload);
          
          // Determine the user profile (if any)
          let userProfile = null;
          if (payload.new.user_id) {
             const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', payload.new.user_id)
              .single();
             userProfile = profile;
          }

          // Construct the new event object
          const newEvent = {
            ...payload.new,
            profiles: userProfile
          };

          setEvents((prev) => [newEvent, ...prev].slice(0, 50));
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
{/* GLOBAL TICKER BAR */}
      <div className="bg-blue-600 py-1 overflow-hidden whitespace-nowrap border-y border-blue-400/30 sticky top-[61px] z-40">
        <div className="inline-block animate-marquee">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className="text-[9px] font-black text-white uppercase tracking-[0.2em] mx-8">
              SYSTEM_PULSE: ACTIVE // TOTAL_VOL_24H: $2,450,890 // ARBITRAGE_DETECTED: {events.length > 0 ? events[0].metadata?.ticker || 'NULL' : 'SCANNING'} //
            </span>
          ))}
        </div>
      </div>

      {/* STANDARD STYLE TAG */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 20s linear infinite;
        }
      `}</style>
      <main className="divide-y divide-white/5">
        {loading ? (
          <div className="p-10 text-center text-xs font-bold text-white/20 animate-pulse uppercase tracking-widest">
            Syncing Global Pulse...
          </div>
        ) : events.length > 0 ? (
          events.map((event) => (
            <article key={event.id} className="p-4 group">
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
                        AGENT: @{event.profiles?.username || 'Oracle_Bot'}
                      </p>
                      <h3 className="text-xl md:text-2xl font-black text-white leading-none tracking-tighter">
                        {event.message || "Unknown Market Event"}
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
                {event.metadata?.item_id && (
                  <div className="border-t border-white/5 bg-black/40">
                    <div className="px-6 py-4 flex items-center justify-between bg-white/[0.01]">
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] flex items-center">
                        <Activity size={14} className="mr-2 text-blue-500" /> 
                        TELEMETRY: {event.metadata.ticker || "UNKNOWN"}
                      </span>
                      <div className="flex space-x-4 text-[9px] font-mono text-white/20">
                        <span>DATA_STREAMS: 4</span>
                        <span>STABILITY: 99.8%</span>
                      </div>
                    </div>
{/* ACTION DOCK */}
<div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex justify-between items-center">
  <div className="flex -space-x-2">
    {/* Visual fluff to show "Market Interest" */}
    {[1, 2, 3].map((i) => (
      <div key={i} className="w-6 h-6 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center text-[8px] font-bold text-white/40">
        {i}
      </div>
    ))}
    <div className="pl-4 text-[9px] font-black text-white/20 uppercase self-center tracking-tighter">
      +14 Agents Monitoring
    </div>
  </div>

  <button 
    onClick={() => router.push(`/charts?ticker=${event.metadata?.ticker || ''}`)}
    className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group"
  >
    Interrogate_Asset
    <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
  </button>
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
          <div className="p-20 text-center border border-dashed border-white/10 rounded-3xl m-4">
             <p className="text-xs font-bold text-white/20 uppercase tracking-[1em]">Scanning Atmosphere...</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
