// pages/item/[id].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import { supabase } from "../../lib/supabaseClient";
import { 
  ArrowLeft, 
  ShieldCheck, 
  TrendingUp, 
  Activity, 
  Info, 
  Bell, 
  Share2, 
  MessageCircle,
  Clock,
  ChevronRight
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import OraclePriceEmbed from "@/components/asset/OraclePriceEmbed";

export default function ItemDetail() {
  const router = useRouter();
  const { id } = router.query as { id?: string };

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchAssetData = async () => {
      setLoading(true);
      
      // Fetch Asset + Profile info
      const { data: asset, error } = await supabase
        .from("items")
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.error("Asset not found");
        router.push("/feed");
        return;
      }
      setItem(asset);

      // Fetch Comments
      const { data: comms } = await supabase
        .from("comments")
        .select("*, profiles(username, avatar_url)")
        .eq("item_id", id)
        .order("created_at", { ascending: false });
      setComments(comms || []);
      
      setLoading(false);
    };

    fetchAssetData();
  }, [id, router]);

  const handlePostComment = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !newComment.trim()) return;

    const { data, error } = await supabase
      .from("comments")
      .insert([{ user_id: user.id, item_id: id, content: newComment }])
      .select("*, profiles(username, avatar_url)")
      .single();

    if (!error && data) {
      setComments([data, ...comments]);
      setNewComment("");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Activity className="animate-spin text-black/10" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-40">
      <Head>
        <title>{item.title} | Flip Oracle</title>
      </Head>

      {/* Top Navigation */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Asset Profile</span>
          <span className="text-xs font-bold text-black font-mono">SKU: {item.sku || 'PENDING'}</span>
        </div>
        <div className="flex space-x-1">
          <button className="p-2 hover:bg-gray-100 rounded-full"><Share2 size={18} /></button>
          <button className="p-2 hover:bg-gray-100 rounded-full"><Bell size={18} /></button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto">
        {/* 1. Hero Image Section */}
        <section className="relative aspect-square bg-white border-b border-gray-100 flex items-center justify-center overflow-hidden">
          <img 
            src={item.image_url} 
            alt={item.title} 
            className="w-full h-full object-contain p-10 hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute bottom-6 left-6">
            <div className="bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center space-x-1.5 shadow-xl">
              <ShieldCheck size={12} className="text-blue-400" />
              <span className="tracking-widest">VERIFIED ORACLE DATA</span>
            </div>
          </div>
        </section>

        {/* 2. Oracle Integrated Price (Decoupled) */}
        <section className="px-4 -mt-8 relative z-10">
          <OraclePriceEmbed sku={item.sku} />
        </section>

        {/* 3. Asset Intelligence Content */}
        <section className="px-5 mt-10 space-y-8">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter text-black uppercase">{item.title}</h1>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed font-medium">{item.description}</p>
          </div>

          {/* Market Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center space-x-2 mb-2 text-gray-400">
                <TrendingUp size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Index Tier</span>
              </div>
              <p className="text-lg font-bold text-black">{item.category || 'Standard'}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center space-x-2 mb-2 text-gray-400">
                <Info size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Scrape Cycle</span>
              </div>
              <p className="text-lg font-bold text-black uppercase">24H Cron</p>
            </div>
          </div>

          {/* Provenance Card */}
          <div className="bg-gray-900 rounded-3xl p-6 text-white flex items-center justify-between shadow-2xl">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-gray-700 to-gray-800 p-0.5">
                <div className="w-full h-full rounded-full bg-gray-900 overflow-hidden flex items-center justify-center border border-white/10">
                  {item.profiles?.avatar_url ? (
                    <img src={item.profiles.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-gray-500 uppercase">Vault</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Vault Authority</p>
                <p className="text-sm font-bold tracking-tight">@{item.profiles?.username || 'anonymous'}</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-600" />
          </div>

          {/* Activity/Comments */}
          <div className="pt-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2 mb-6">
              <MessageCircle size={16} /> Market Signals ({comments.length})
            </h2>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Drop a market signal..." 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 bg-white border border-gray-200 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
                <button 
                  onClick={handlePostComment}
                  className="bg-black text-white text-[10px] font-black uppercase px-6 rounded-2xl active:scale-95 transition-transform"
                >
                  Post
                </button>
              </div>

              <div className="space-y-3 pb-20">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-white p-5 rounded-3xl border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-tight text-black">@{comment.profiles?.username}</span>
                      <span className="text-[10px] font-bold text-gray-300 uppercase">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 font-medium leading-relaxed">{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Action Bar */}
      <div className="fixed bottom-24 left-0 right-0 px-6 z-40 pointer-events-none">
        <div className="max-w-md mx-auto bg-black rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-4 flex items-center justify-between border border-white/10 pointer-events-auto">
          <div className="pl-2">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Tracking Mode</p>
            <p className="text-white text-xs font-bold uppercase italic tracking-tighter">Live Portfolio Active</p>
          </div>
          <button className="bg-white text-black text-[10px] font-black uppercase px-8 py-4 rounded-2xl hover:bg-gray-100 transition-colors">
            Set Value Alert
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
