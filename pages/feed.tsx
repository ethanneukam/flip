import { useEffect, useState } from "react";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/components/BottomNav";
import { Zap, TrendingUp, MessageCircle, ShieldCheck, Clock, Activity } from "lucide-react";
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

      if (!error) setEvents(data || []);
      setLoading(false);
    };
    fetchFeed();
  }, []);

  return (
    <div className="min-h-screen bg-white pb-32">
      <Head>
        <title>Pulse | Flip</title>
      </Head>

      <header className="p-4 border-b border-gray-50 sticky top-0 bg-white/80 backdrop-blur-md z-50 flex justify-between items-center">
        <h1 className="text-xl font-black italic tracking-tighter uppercase">The Pulse</h1>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Live</span>
        </div>
      </header>

      <main className="divide-y divide-gray-50">
        {loading ? (
          <div className="p-10 text-center text-xs font-bold text-gray-400 animate-pulse uppercase tracking-widest">
            Syncing Global Pulse...
          </div>
        ) : events.length > 0 ? (
          events.map((event) => (
            <article key={event.id} className="p-4 space-y-3">
              {/* Event Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${event.type === 'VAULT_ADD' ? 'bg-blue-500' : 'bg-black'}`}>
                    {event.type === 'VAULT_ADD' ? <ShieldCheck size={12} className="text-white" /> : <Zap size={12} className="text-yellow-400" />}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">
                    {event.type === 'VAULT_ADD' ? 'Vault Entry' : 'Oracle Alert'}
                  </span>
                </div>
                <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase">
                  <Clock size={10} className="mr-1" />
                  {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Event Content */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-blue-500 uppercase mb-1">
                      AGENT: @{event.profiles?.username || 'Anonymous'}
                    </p>
                    <h3 className="text-sm font-bold leading-tight">{event.title}</h3>
                    <p className="text-[11px] text-gray-500 mt-1">{event.description}</p>
                  </div>
                  {event.metadata?.image_url && (
                    <div className="w-16 h-16 rounded-xl bg-white border border-gray-100 overflow-hidden flex-shrink-0">
                      <img src={event.metadata.image_url} className="w-full h-full object-cover" alt="Asset" />
                    </div>
                  )}
                </div>

                {/* Day 32: Chart Embed */}
                {event.type === 'VAULT_ADD' && (
                  <div className="mt-4 pt-4 border-t border-gray-200/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                        <Activity size={10} className="mr-1" /> Market Performance
                      </span>
                      <span className="text-[10px] font-bold text-green-500">+2.4% Today</span>
                    </div>
                    <div className="h-20 w-full opacity-60 grayscale hover:grayscale-0 transition-all">
                      <MarketChart /> 
                    </div>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="flex items-center space-x-6 pt-1">
                <button className="flex items-center space-x-1.5 text-gray-400 hover:text-black transition-colors">
                  <MessageCircle size={14} />
                  <span className="text-[10px] font-black uppercase">Market Inquiry</span>
                </button>
                <button className="flex items-center space-x-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                  <ShieldCheck size={14} />
                  <span className="text-[10px] font-black uppercase">Verify</span>
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="p-20 text-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No Pulse Detected</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
