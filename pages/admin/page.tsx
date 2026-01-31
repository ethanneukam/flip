"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>(["[SYSTEM]: Initialization complete.", "[SYSTEM]: Awaiting signal..."]);
  const [stats, setStats] = useState({ totalItems: 0, priceUpdates: 0 });
  const [isScraping, setIsScraping] = useState(false);

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
          addLog(`[FEED]: New ${payload.new.type} detected.`);
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

  const addLog = (msg: string) => {
    setLogs(prev => [`> ${msg}`, ...prev].slice(0, 10));
  };

  // FORCE SCRAPE FUNCTION
  // Note: This requires a secondary API route or Edge Function to trigger the scraper script
  async function handleForceScrape() {
    setIsScraping(true);
    addLog("MANUAL_OVERRIDE: Triggering Oracle via API...");
    
    try {
      // Point this to your scraper trigger endpoint
      const res = await fetch("/api/trigger-oracle", { method: "POST" });
      if (res.ok) {
        addLog("SUCCESS: Scraper process initiated.");
      } else {
        addLog("ERROR: API failed to trigger process.");
      }
    } catch (err) {
      addLog("CRITICAL: Connection to Oracle lost.");
    } finally {
      setTimeout(() => setIsScraping(false), 5000);
    }
  }

  return (
    <div className="min-h-screen bg-black text-green-400 p-4 font-mono selection:bg-green-900 selection:text-white">
      {/* HEADER */}
      <header className="border-b border-green-900 pb-4 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-white">ORACLE_CONTROL_v1.0</h1>
          <p className="text-xs opacity-50 text-green-500 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            SYSTEM STATUS: ONLINE (Infinite Loop Active)
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs">NODES_SCANNED: {stats.totalItems}</p>
          <p className="text-xs">MARKET_PULSES: {stats.priceUpdates}</p>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LIVE FEED LIST (Large Column) */}
        <section className="lg:col-span-3 bg-zinc-900/30 rounded-lg p-4 border border-zinc-800 backdrop-blur-sm">
          <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-white uppercase tracking-widest">
            LIVE_PULSE_FEED
          </h2>
          <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
            {events.length === 0 && <p className="text-xs opacity-30 italic">No pulses detected in current session...</p>}
            {events.map((event) => (
              <div key={event.id} className="text-xs p-3 border-l-2 border-green-700 bg-zinc-900/60 rounded-r shadow-lg transition-all hover:bg-zinc-800">
                <div className="flex justify-between mb-1 opacity-70 font-bold uppercase">
                  <span>{event.type}</span>
                  <span>{new Date(event.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm font-semibold text-green-300">{event.title}</p>
                <p className="opacity-80 italic mt-1">{event.message}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SIDEBAR (Controls & Terminal) */}
        <section className="space-y-6">
          {/* SYSTEM COMMANDS */}
          <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 shadow-xl">
            <h2 className="text-sm font-bold mb-4 text-white uppercase">COMMAND_CENTER</h2>
            <button 
              onClick={handleForceScrape}
              disabled={isScraping}
              className={`w-full py-4 mb-3 font-bold rounded flex items-center justify-center gap-2 transition-all ${
                isScraping 
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                : "bg-green-600 text-black hover:bg-green-400 active:scale-95 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
              }`}
            >
              {isScraping ? "SCRAPING..." : "FORCE_SCRAPE_NOW"}
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-2 text-xs border border-green-900 text-green-700 rounded hover:bg-green-900/20 transition-all uppercase"
            >
              Reset Interface
            </button>
          </div>

          {/* LIVE TERMINAL LOGS */}
          <div className="bg-black p-4 rounded-lg border border-zinc-800 shadow-2xl h-64 flex flex-col">
            <h2 className="text-[10px] font-bold mb-2 text-zinc-500 uppercase tracking-tighter">System_Logs</h2>
            <div className="flex-1 overflow-hidden font-mono text-[10px] leading-tight space-y-1">
              {logs.map((log, i) => (
                <p key={i} className={i === 0 ? "text-green-400" : "text-green-900"}>{log}</p>
              ))}
            </div>
          </div>

          {/* HARVESTER STATS */}
          <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
            <h2 className="text-sm font-bold mb-3 text-white uppercase">BRAIN_DIAGNOSTICS</h2>
            <div className="space-y-2 text-[10px]">
              <div className="flex justify-between"><span>SEEDS:</span><span className="text-white">AUTO_INJECT</span></div>
              <div className="flex justify-between"><span>GHOST_PURGE:</span><span className="text-white">ENABLED</span></div>
              <div className="flex justify-between"><span>RATIO:</span><span className="text-white">98.4%_UPTIME</span></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
