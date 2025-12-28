// pages/feed.tsx
import { useEffect, useState } from "react";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/components/layout/BottomNav";
import { Zap, TrendingDown, TrendingUp, MessageCircle } from "lucide-react";

export default function PulseFeed() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchFeed = async () => {
      // Fetching both user items and price alerts
      const { data } = await supabase
        .from("items")
        .select("*, profiles(username, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(20);
      setEvents(data || []);
    };
    fetchFeed();
  }, []);

  return (
    <div className="min-h-screen bg-white pb-32">
      <Head>
        <title>Pulse | Flip</title>
      </Head>

      <header className="p-4 border-b border-gray-50 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <h1 className="text-xl font-black italic tracking-tighter">THE PULSE</h1>
      </header>

      <main className="divide-y divide-gray-50">
        {events.map((event) => (
          <article key={event.id} className="p-4 space-y-3">
            {/* Header: User or Oracle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center">
                  <Zap size={12} className="text-yellow-400" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Oracle Alert</span>
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase">2h ago</span>
            </div>

            {/* Content Card */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-sm font-bold leading-tight">{event.title}</h3>
                  <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase">{event.sku || 'Market SKU'}</p>
                </div>
                <div className="text-right">
                   <div className="flex items-center text-green-600 font-black text-sm">
                     <TrendingUp size={14} className="mr-1" />
                     +4.2%
                   </div>
                   <p className="text-[10px] font-bold text-gray-400">$1,420</p>
                </div>
              </div>
            </div>

            {/* Social Actions */}
            <div className="flex items-center space-x-4 pt-1">
              <button className="flex items-center space-x-1 text-gray-400">
                <MessageCircle size={16} />
                <span className="text-[10px] font-bold">12 Signals</span>
              </button>
            </div>
          </article>
        ))}
      </main>

      <BottomNav />
    </div>
  );
}
