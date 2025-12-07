// pages/item/[id].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Heart, Star, ArrowLeft, MessageSquare, Loader2 } from "lucide-react";
import { RealtimeChannel } from "@supabase/supabase-js";
import PriceChart from "@/components/PriceChart";
import AddressPicker from "@/components/AddressPicker";
import PriceInsights from "@/components/PriceInsights";
import TrendBadge from "@/components/TrendBadge";
import FlipScore from "@/components/FlipScore";
import MomentumTag from "@/components/MomentumTag";

export default function ItemDetail() {
  const router = useRouter();
  const { id } = router.query as { id?: string };

  const [item, setItem] = useState<any>(null);
  const [relatedItems, setRelatedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [marking, setMarking] = useState(false);
  const [priceData, setPriceData] = useState<{ date: string; price: number }[]>([]);

  const [user, setUser] = useState<any>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  const [seller, setSeller] = useState<any>(null);

  // external prices
  const [externalPrices, setExternalPrices] = useState<any[]>([]);
  const [bestExternal, setBestExternal] = useState<any | null>(null);

  // shipping address picker state
  const [to, setTo] = useState<any>(null);
  const [rates, setRates] = useState<any[]>([]);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [sellerBalance, setSellerBalance] = useState(0);

  const [recommendations, setRecommendations] = useState<any[]>([]);

  const sampleData = [
    { date: "2025-11-01", price: 120 },
    { date: "2025-11-02", price: 125 },
    { date: "2025-11-03", price: 122 },
    { date: "2025-11-04", price: 130 },
  ];

  // ---------- Derived metrics (computed inside component to use state safely) ----------
  const priceNumbers = priceData.map((p) => p.price);
  const priceMin = priceNumbers.length ? Math.min(...priceNumbers) : 0;
  const priceMax = priceNumbers.length ? Math.max(...priceNumbers) : 0;
  const priceAvg = priceNumbers.length ? priceNumbers.reduce((s, v) => s + v, 0) / priceNumbers.length : 0;

  // volatility as percent (0..100)
  const volatilityPercent =
    priceData.length > 1 && priceAvg > 0
      ? Math.round(((priceMax - priceMin) / priceAvg) * 100)
      : 0;

  // momentum tag (last 5 data points)
  const recent = priceData.slice(-5);
  let momentumTag = "Sideways";
  if (recent.length >= 2) {
    const first = recent[0].price;
    const last = recent[recent.length - 1].price;
    const diff = last - first;
    const pct = first !== 0 ? (diff / first) * 100 : 0;
    if (pct > 12) momentumTag = "Spiking";
    else if (pct > 5) momentumTag = "Pumping";
    else if (pct > -5 && pct < 5) momentumTag = "Sideways";
    else if (pct < -5 && pct > -12) momentumTag = "Cooling Off";
    else if (pct <= -12) momentumTag = "Crashing";
  }

  // percent change vs 7 days ago (if available)
  const lastPrice = priceData.length > 0 ? priceData[priceData.length - 1].price : null;
  const price7DaysAgo = priceData.length > 7 ? priceData[priceData.length - 8].price : lastPrice;
  const percentChange = lastPrice && price7DaysAgo ? ((lastPrice - price7DaysAgo) / price7DaysAgo) * 100 : 0;

  // volatility category used in FlipScore (string)
  const volatilityCategory =
    item && item.price
      ? priceMax - priceMin > item.price * 0.2
        ? "high"
        : priceMax - priceMin > item.price * 0.1
        ? "medium"
        : "low"
      : "low";

  // Flip score: keep your scoring spirit but computed here
  const flipScore = Math.min(
    100,
    Math.max(
      1,
      80 + (percentChange > 0 ? percentChange * 0.5 : percentChange * 0.3) - (volatilityCategory === "high" ? 10 : 0)
    )
  );

  function getFlipScoreColor(score: number) {
    if (score >= 75) return "bg-green-500 text-white";
    if (score >= 50) return "bg-yellow-400 text-black";
    if (score >= 25) return "bg-orange-400 text-white";
    return "bg-red-500 text-white";
  }

  // ------------------- Effects -------------------

  // Fetch main item + seller + related items
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const fetchItem = async () => {
      try {
        const { data, error } = await supabase.from("items").select("*").eq("id", id).single();
        if (error) {
          console.error("Error fetching item:", error.message);
          setLoading(false);
          return;
        }
        setItem(data);

        // seller profile
        const { data: sellerData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .eq("id", data.user_id)
          .single();
        setSeller(sellerData);

        // related items
        if (data?.category) {
          const { data: related } = await supabase
            .from("items")
            .select("*")
            .eq("category", data.category)
            .neq("id", data.id)
            .limit(4);
          setRelatedItems(related || []);
        }
      } catch (e) {
        console.error("fetchItem error", e);
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  // Fetch price history
  useEffect(() => {
    if (!id) return;
    const fetchPriceHistory = async () => {
      const { data, error } = await supabase
        .from("item_prices")
        .select("price, created_at")
        .eq("item_id", id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching price history:", error.message);
        return;
      }

      const formattedData =
        data?.map((entry: any) => ({
          date: new Date(entry.created_at).toLocaleDateString(),
          price: entry.price,
        })) ?? [];

      setPriceData(formattedData);
    };

    fetchPriceHistory();
  }, [id]);

  // Fetch external prices for current item
  useEffect(() => {
    if (!id) return;
    const fetchExternal = async () => {
      const { data, error } = await supabase
        .from("external_prices")
        .select("source, price, url, last_checked")
        .eq("item_id", id)
        .order("price", { ascending: true });

      if (error) {
        console.error("Error fetching external prices:", error.message);
        return;
      }

      setExternalPrices(data || []);
      if (data && data.length > 0) {
        setBestExternal(data[0]);
        const externalChartPoints = data.map((p: any) => ({
          date: p.last_checked ? new Date(p.last_checked).toLocaleDateString() : new Date().toLocaleDateString(),
          price: p.price,
        }));
        setPriceData((prev) => [...prev, ...externalChartPoints]);
      }
    };

    fetchExternal();
  }, [id]);

  // Social + likes + comments + user session
  useEffect(() => {
    const initSocial = async () => {
      const { data: auth } = await supabase.auth.getUser();
      setUser(auth.user || null);
      if (!id) return;

      const { count: likes } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("item_id", id);
      setLikesCount(likes || 0);

      if (auth.user) {
        const { data: like } = await supabase
          .from("likes")
          .select("*")
          .eq("item_id", id)
          .eq("user_id", auth.user.id)
          .single();
        setIsLiked(!!like);

        const { data: fav } = await supabase
          .from("favorites")
          .select("*")
          .eq("item_id", id)
          .eq("user_id", auth.user.id)
          .single();
        setIsFavorited(!!fav);
      }

      const { data: commentsData } = await supabase
        .from("comments")
        .select("*, profiles(username, avatar_url)")
        .eq("item_id", id)
        .order("created_at", { ascending: false });
      setComments(commentsData || []);
    };

    initSocial();
  }, [id]);

  // Realtime subscriptions for likes/comments
  useEffect(() => {
    if (!id) return;
    let likesChannel: RealtimeChannel | undefined;
    let commentsChannel: RealtimeChannel | undefined;

    const setupRealtime = async () => {
      likesChannel = supabase
        .channel("likes-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "likes", filter: `item_id=eq.${id}` },
          async () => {
            const { count } = await supabase
              .from("likes")
              .select("*", { count: "exact" })
              .eq("item_id", id);
            setLikesCount(count || 0);
          }
        )
        .subscribe();

      commentsChannel = supabase
        .channel("comments-changes")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "comments", filter: `item_id=eq.${id}` },
          (payload) => setComments((prev) => [payload.new, ...prev])
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (likesChannel) supabase.removeChannel(likesChannel);
      if (commentsChannel) supabase.removeChannel(commentsChannel);
    };
  }, [id]);

  // Fetch flip coins related to this item & seller balance
  useEffect(() => {
    if (!id) return;
    const fetchCoins = async () => {
      const { data } = await supabase.from("flip_coins").select("amount").eq("related_id", id);
      const totalEarned = data?.reduce((sum: number, row: any) => sum + row.amount, 0) || 0;
      setCoinsEarned(totalEarned);

      if (item?.user_id) {
        const { data: s } = await supabase.from("profiles").select("flip_coins_balance").eq("id", item.user_id).single();
        setSellerBalance(s?.flip_coins_balance || 0);
      }
    };
    fetchCoins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, item?.user_id]);

  // Recommendations generator (keeps your logic)
  useEffect(() => {
    if (!item || priceData.length === 0) return;

    const generateRecommendations = async () => {
      const { data: relatedRaw } = await supabase
        .from("items")
        .select("*")
        .eq("category", item.category)
        .neq("id", item.id)
        .limit(25);

      if (!relatedRaw) return;

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;

      let likedItems: any[] = [];
      let favoritedItems: any[] = [];

      if (userId) {
        const { data: liked } = await supabase.from("likes").select("item_id").eq("user_id", userId);
        likedItems = liked?.map((l) => l.item_id) || [];

        const { data: fav } = await supabase.from("favorites").select("item_id").eq("user_id", userId);
        favoritedItems = fav?.map((f) => f.item_id) || [];
      }

      const withExternal = relatedRaw.map((rec: any) => {
        const ext = externalPrices.find((p: any) => p.item_id === rec.id || p.itemId === rec.id || false) as any;
        return {
          ...rec,
          externalPrice: ext?.price ?? null,
          externalSource: ext?.source ?? null,
          externalUrl: ext?.url ?? null,
        };
      });

      const enriched = await Promise.all(
        withExternal.map(async (rec) => {
          let ai = 50;
          ai += Math.max(0, 25 - Math.abs(rec.price - (item.price || 0)) * 0.5);
          if (rec.externalPrice && rec.externalPrice < rec.price) ai += 10;
          if (likedItems.includes(rec.id)) ai += 7;
          if (favoritedItems.includes(rec.id)) ai += 7;

          const { data: trend } = await supabase
            .from("item_prices")
            .select("price, created_at")
            .eq("item_id", rec.id)
            .order("created_at", { ascending: true })
            .limit(5);

          if (trend && trend.length >= 2) {
            const first = trend[0].price;
            const last = trend[trend.length - 1].price;
            const pct = first !== 0 ? ((last - first) / first) * 100 : 0;
            if (pct > 10) ai += 10;
            else if (pct < -10) ai -= 10;
            rec.momentumPct = pct;
          } else {
            rec.momentumPct = 0;
          }

          return {
            ...rec,
            aiScore: Math.min(100, Math.max(1, Math.round(ai))),
          };
        })
      );

      const sorted = enriched.sort(
        (a, b) =>
          (b.aiScore as number) - (a.aiScore as number) ||
          Math.abs(a.price - (item.price || 0)) - Math.abs(b.price - (item.price || 0)) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setRecommendations(sorted.slice(0, 6));
    };

    generateRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, priceData, externalPrices]);

  // ------------------- Actions -------------------
  async function handleLike() {
    if (!user) return alert("Log in to like items.");
    if (!id) return;
    if (isLiked) {
      await supabase.from("likes").delete().eq("item_id", id).eq("user_id", user.id);
      setLikesCount((c) => Math.max(0, c - 1));
      setIsLiked(false);
    } else {
      await supabase.from("likes").insert({ item_id: id, user_id: user.id });
      setLikesCount((c) => c + 1);
      setIsLiked(true);
    }
  }

  async function handleFavorite() {
    if (!user) return alert("Log in to favorite items.");
    if (!id) return;
    if (isFavorited) {
      await supabase.from("favorites").delete().eq("item_id", id).eq("user_id", user.id);
      setIsFavorited(false);
    } else {
      await supabase.from("favorites").insert({ item_id: id, user_id: user.id });
      setIsFavorited(true);
    }
  }

  async function handlePostComment() {
    if (!user) return alert("Please log in to comment.");
    if (!newComment.trim()) return;

    const { data, error } = await supabase
      .from("comments")
      .insert([{ user_id: user.id, item_id: id, content: newComment }])
      .select("*, profiles(username, avatar_url)")
      .single();

    if (!error && data) {
      setComments((prev) => [data, ...prev]);
      setNewComment("");
    }
  }

  const handleBuyNow = async () => {
    if (!item) return;
    setProcessing(true);

    try {
      const { data: { user: authUser } = { user: null } } = await supabase.auth.getUser();
      const currentUser = authUser || user;
      if (!currentUser) {
        alert("You must be logged in to purchase.");
        router.push("/login");
        return;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: item.id,
          buyer_email: currentUser.email,
        }),
      });

      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Error starting checkout: " + (data.error || "Unknown error"));
    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // sellerAddress for shipping call (fallbacks)
  const sellerAddress = item?.seller_address || seller?.address || null;

  // ------------------- Render -------------------
  if (loading)
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="animate-spin w-8 h-8 text-gray-500" />
      </div>
    );

  if (!item) return <p className="p-6 text-center text-gray-600">Item not found.</p>;

  return (
    <main className="max-w-4xl mx-auto p-6">
      <button onClick={() => router.back()} className="flex items-center mb-4 text-gray-600 hover:text-black">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      {/* Item + Seller Card */}
      <div className="bg-white shadow-md rounded-2xl overflow-hidden mb-6">
        {item.image_url && <img src={item.image_url} alt={item.title} className="w-full h-72 object-cover" />}

        <div className="p-5">
          <h1 className="text-2xl font-bold mb-1">{item.title}</h1>
          <p className="text-gray-600 mb-3">{item.description}</p>
          <p className="text-xl font-bold mb-4">${item.price}</p>
          <p className="text-xl font-bold mb-2">${item.price}</p>

          <PriceInsights item={item} externalPrices={externalPrices} />

          {/* Price Stats */}
          <div className="flex justify-between bg-gray-50 p-3 rounded-xl mb-2 text-sm text-gray-700">
            <div>
              <p className="text-gray-500">Lowest</p>
              <p className="font-semibold">${priceMin}</p>
            </div>
            <div>
              <p className="text-gray-500">Highest</p>
              <p className="font-semibold">${priceMax}</p>
            </div>
            <div>
              <p className="text-gray-500">7-Day Avg</p>
              <p className="font-semibold">${Math.round(priceData.slice(-7).reduce((s, p) => s + p.price, 0) / Math.min(7, priceData.length) || 0)}</p>
            </div>
            <div>
              <p className="text-gray-500">30-Day Avg</p>
              <p className="font-semibold">${Math.round(priceData.slice(-30).reduce((s, p) => s + p.price, 0) / Math.min(30, priceData.length) || 0)}</p>
            </div>
          </div>

          <div className="my-3">
            <TrendBadge percentChange={percentChange} />
          </div>

          {/* Flip Score */}
          <FlipScore score={Math.round(flipScore)} volatility={volatilityCategory as any} recommendation={recommendationFromScore(flipScore)} />

          {/* Momentum Tag */}
          <div className="my-3">
            <MomentumTag tag={momentumTag} />
          </div>

          <div className="flex gap-2 items-center mt-2">
            <span className="text-sm text-gray-500">Volatility: <strong>{volatilityPercent}%</strong></span>
            <span className={`px-2 py-1 rounded-full text-sm font-semibold ${getFlipScoreColor(flipScore)}`}>FlipScore: {Math.round(flipScore)}/100</span>
          </div>

          <div className="p-4">
            <h1 className="text-2xl font-bold">{item.title}</h1>
            <p className="mt-2 text-gray-700">{item.description}</p>

            <div className="mt-4 p-3 border rounded bg-yellow-50">
              <p className="font-semibold">Coins for this listing: {coinsEarned} FC</p>
              <p className="font-semibold">Seller total Flip Coins: {sellerBalance} FC</p>
            </div>
          </div>

          {/* Best Price Across Internet */}
          {bestExternal && (
            <div className="mb-4 p-4 bg-green-100 border-l-4 border-green-500 rounded-lg">
              <p className="text-sm text-gray-700">
                Best price across internet:{" "}
                <a href={bestExternal.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-green-800 underline">
                  ${bestExternal.price} ({bestExternal.source})
                </a>
              </p>
            </div>
          )}

          {/* Price Chart */}
          <div className="mb-4">
            {priceData.length > 0 ? <PriceChart data={priceData} /> : <PriceChart data={sampleData} />}
          </div>

          {/* Shipping section */}
          <div className="p-4 border rounded mt-4">
            <h2 className="font-bold mb-2">Shipping</h2>

            <AddressPicker userId="temp-buyer" onSelect={(addr: any) => setTo(addr)} />

            <button
              className="bg-black text-white px-4 py-2 rounded mt-3"
              onClick={async () => {
                const r = await fetch("/api/shipping/rates", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    from: sellerAddress,
                    to,
                    weightOz: 16,
                  }),
                });
                const data = await r.json();
                setRates((data?.rates?.rate_response?.rates as any[]) || []);
              }}
            >
              Get Rates
            </button>

            {rates.length > 0 && (
              <div className="mt-4 space-y-2">
                {rates.map((r: any) => (
                  <div key={r.rate_id} className="p-3 border rounded">
                    <p>{r.carrier_friendly_name} — ${r.shipping_amount?.amount}</p>
                    <button className="underline text-blue-500 text-sm">Choose</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seller Info */}
          {item.seller && (
            <div className="flex items-center mb-4 gap-3 cursor-pointer hover:opacity-80" onClick={() => router.push(`/profile?user_id=${item.user_id}`)}>
              {item.seller.avatar_url ? <img src={item.seller.avatar_url} className="w-10 h-10 rounded-full" alt={item.seller.username} /> : <div className="w-10 h-10 rounded-full bg-gray-300" />}
              <span className="font-medium">{item.seller.username}</span>
            </div>
          )}

          {/* Like & Favorite */}
          <div className="flex items-center gap-4 mb-6">
            <button onClick={handleLike} className="flex items-center gap-1 text-lg">
              <Heart className={`w-5 h-5 ${isLiked ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
              {likesCount}
            </button>
            <button onClick={handleFavorite} className="flex items-center gap-1 text-lg">
              <Star className={`w-5 h-5 ${isFavorited ? "fill-yellow-400 text-yellow-400" : "text-gray-500"}`} />
            </button>
          </div>

          {/* Buy Now */}
          <button onClick={handleBuyNow} disabled={processing} className={`w-full py-3 rounded-xl font-medium text-white ${processing ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
            {processing ? "Processing..." : "Buy Now"}
          </button>
        </div>
      </div>

      {/* Comments Section */}
      <section className="mt-8 bg-white shadow-md rounded-2xl p-5">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" /> Comments
        </h2>

        <div className="flex space-x-2 mb-4">
          <input type="text" placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="flex-1 border rounded-lg px-3 py-2" />
          <button onClick={handlePostComment} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Post
          </button>
        </div>

        <div className="space-y-4">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="border-b pb-2">
                <p className="text-sm text-gray-800">
                  <strong>{comment.profiles?.username || "User"}:</strong> {comment.content}
                </p>
                <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString()}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No comments yet.</p>
          )}
        </div>
      </section>

      {/* Related Items */}
      {relatedItems.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Related Items</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {relatedItems.map((rel) => (
              <div key={rel.id} onClick={() => router.push(`/item/${rel.id}`)} className="cursor-pointer bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition">
                {rel.image_url && <img src={rel.image_url} alt={rel.title} className="w-full h-40 object-cover rounded-lg mb-2" />}
                <h3 className="font-medium">{rel.title}</h3>
                <p className="font-semibold">${rel.price}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Recommended for You</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {recommendations.map((rec) => (
              <div key={rec.id} onClick={() => router.push(`/item/${rec.id}`)} className="cursor-pointer bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition">
                {rec.image_url && <img src={rec.image_url} alt={rec.title} className="w-full h-40 object-cover rounded-lg mb-2" />}
                <h3 className="font-medium">{rec.title}</h3>
                <p className="font-semibold">${rec.price}</p>
                {rec.externalPrice && <p className="text-xs text-green-600">${rec.externalPrice} on {rec.externalSource}</p>}

                {item?.moderated ? <span className="text-xs text-green-600">Image checked</span> : <span className="text-xs text-yellow-600">Pending moderation</span>}

                <div className={`mt-2 px-2 py-1 text-xs font-semibold rounded-full ${rec.aiScore >= 75 ? "bg-green-500 text-white" : rec.aiScore >= 50 ? "bg-yellow-400 text-black" : "bg-red-500 text-white"}`}>
                  AI Score: {rec.aiScore} ({rec.momentumPct?.toFixed?.(1) ?? "0"}%)
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

// small helper used above to derive recommendation text
function recommendationFromScore(score: number) {
  return score >= 70 ? "buy" : score >= 40 ? "hold" : "sell";
}
