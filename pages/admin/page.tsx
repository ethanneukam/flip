"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalItems: 0, priceUpdates: 0 });

  useEffect(() => {
    fetchInitialData();

    // REALTIME SUBSCRIPTION: Listen for new feed events
    const channel = supabase
      .channel("realtime-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "feed_events" },
        (payload) => {
          setEvents((prev) => [payload.new, ...prev].slice(0, 50));
          if (payload.new.type === "PRICE_UPDATE") {
            setStats((s) => ({ ...s, priceUpdates: s.priceUpdates + 1 }));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchInitialData() {
    const { data: latestEvents } = await supabase
      .from("feed_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    
    const { count: itemCount } = await supabase.from("items").select("*", { count: 'exact', head: true });
    
    if (latestEvents) setEvents(latestEvents);
    setStats(s => ({ ...s, totalItems: itemCount || 0 }));
  }

  return (
    <div className="min-h-screen bg-black text-green-400 p-4 font-mono">
      <header className="border-b border-green-900 pb-4 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-white">ORACLE_CONTROL_v1.0</h1>
          <p className="text-xs opacity-50 text-green-500">System Status: ONLINE (Infinite Loop Active)</p>
        </div>
        <div className="text-right">
          <p className="text-xs">NODES_SCANNED: {stats.totalItems}</p>
          <p className="text-xs">MARKET_PULSES: {stats.priceUpdates}</p>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LIVE FEED LIST */}
        <section className="md:col-span-2 bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
          <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-white">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            LIVE_PULSE_FEED
          </h2>
          <div className="space-y-3 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
            {events.map((event) => (
              <div key={event.id} className="text-xs p-3 border-l-2 border-green-700 bg-black/40 rounded-r shadow-sm">
                <div className="flex justify-between mb-1 opacity-70">
                  <span>{event.type}</span>
                  <span>{new Date(event.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm font-semibold text-green-300">{event.title}</p>
                <p className="opacity-80 italic mt-1">{event.message}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SYSTEM ACTIONS & BRAIN STATUS */}
        <section className="space-y-6">
          <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
            <h2 className="text-sm font-bold mb-4 text-white">BRAIN_DIAGNOSTICS</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span>SEEDS_GENERATED:</span><span className="text-white">AUTO</span></div>
              <div className="flex justify-between"><span>GHOST_NODES_PURGED:</span><span className="text-white text-right font-bold">YES</span></div>
              <div className="flex justify-between"><span>HARVEST_MODE:</span><span className="text-white font-bold">AGGRESSIVE</span></div>
            </div>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-green-600 text-black font-bold rounded hover:bg-green-400 transition-colors"
          >
            REFRESH_ORACLE_VIEW
          </button>
        </section>
      </main>
    </div>
  );
}
