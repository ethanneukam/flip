// pages/item/[id].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Heart, Star, ArrowLeft, MessageSquare, Loader2 } from "lucide-react";
import { RealtimeChannel } from "@supabase/supabase-js";
import PriceChart from '@/components/PriceChart';

export default function ItemDetail() {
  const router = useRouter();
  const { id } = router.query;
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
// external prices state (add this near your other useState calls)
const [externalPrices, setExternalPrices] = useState<
  { source: string; price: number; url: string; last_checked?: string }[]
>([]);

const [bestExternal, setBestExternal] = useState<
  { source: string; price: number; url: string } | null
>(null);

const sampleData = [
  { date: '2025-11-01', price: 120 },
  { date: '2025-11-02', price: 125 },
  { date: '2025-11-03', price: 122 },
  { date: '2025-11-04', price: 130 },
];
// ------------------- VOLATILITY & FLIPSCORE -------------------
const volatility =
  priceData.length > 1
    ? Math.round(
        ((Math.max(...priceData.map(p => p.price)) - Math.min(...priceData.map(p => p.price))) /
          (priceData.reduce((sum, p) => sum + p.price, 0) / priceData.length)) *
          100
      )
    : 0;
// simple scoring: spiking + high volatility → higher FlipScore
const momentumScoreMap: Record<string, number> = {
  "Spiking": 30,
  "Pumping": 20,
  "Sideways": 10,
  "Cooling Off": 5,
  "Crashing": 0,
};

const flipScore = Math.min(
  100,
  (momentumScoreMap[momentumTag] || 0) + Math.min(volatility, 70)
);
function getFlipScoreColor(score: number) {
  if (score >= 75) return "bg-green-500 text-white";    // hot flips
  if (score >= 50) return "bg-yellow-400 text-black";   // medium
  if (score >= 25) return "bg-orange-400 text-white";   // low
  return "bg-red-500 text-white";                       // risky/low
}
const [recommendations, setRecommendations] = useState<any[]>([]);

useEffect(() => {
  if (!item || priceData.length === 0) return;

  const generateRecommendations = async () => {
    // 1️⃣ Fetch items in same category excluding current
    const { data: relatedItemsData } = await supabase
      .from("items")
      .select("*")
      .eq("category", item.category)
      .neq("id", item.id)
      .limit(20); // fetch more for sorting/filtering

    if (!relatedItemsData) return;

    // 2️⃣ Add external prices if available
    const withExternal = relatedItemsData.map((rec: any) => {
      const external = externalPrices.find((p) => rec.id === item.id);
      return {
        ...rec,
        externalPrice: external ? external.price : null,
        externalSource: external ? external.source : null,
        externalUrl: external ? external.url : null,
      };
    });

    // 3️⃣ Compute AI Score
    const enriched = withExternal.map((rec) => {
      // Base FlipScore
      let score = Math.min(
        100,
        Math.max(
          1,
          80 +
            (percentChange > 0 ? percentChange * 0.5 : percentChange * 0.3) -
            (volatility === "high" ? 10 : 0)
        )
      );

      // Trending / Momentum Bonus
      const recPrices = await supabase
        .from("item_prices")
        .select("price, created_at")
        .eq("item_id", rec.id)
        .order("created_at", { ascending: true });
      const lastRecPrice = recPrices.data?.slice(-1)[0]?.price ?? rec.price;
      const firstRecPrice = recPrices.data?.slice(-5)[0]?.price ?? rec.price;
      const recPctChange = ((lastRecPrice - firstRecPrice) / firstRecPrice) * 100;
      if (recPctChange > 10) score += 10; // Trending spike
      else if (recPctChange < -10) score -= 10; // Cooling off

      // User behavior bonus (liked/favorited)
      if (rec.userLiked) score += 5;
      if (rec.userFavorited) score += 5;

      return {
        ...rec,
        aiScore: Math.min(100, Math.max(0, Math.round(score))),
        momentumPct: recPctChange,
      };
    });

    // 4️⃣ Sort by AI Score + proximity to current item price
    const sorted = enriched.sort(
      (a, b) =>
        b.aiScore - a.aiScore || Math.abs(a.price - item.price) - Math.abs(b.price - item.price)
    );

    setRecommendations(sorted.slice(0, 5)); // top 5 recommendations
  };

  generateRecommendations();
}, [item, priceData, externalPrices]);


  // ------------------- FETCH ITEM -------------------
  useEffect(() => {
    if (!id) return;

    const fetchItem = async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .single();

      if (error) console.error("Error fetching item:", error.message);
      else {
        setItem(data);

        // Fetch seller info
        const { data: sellerData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .eq("id", data.user_id)
          .single();
        setSeller(sellerData);

        if (data?.category) {
          const { data: related } = await supabase
            .from("items")
            .select("*")
            .eq("category", data.category)
            .neq("id", data.id)
            .limit(4);
          setRelatedItems(related || []);
        }
      }
      setLoading(false);
    };
    fetchItem();
  }, [id]);

// ------------------- FETCH ITEM PRICE HISTORY -------------------
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
console.log("Fetched price data:", data); // <-- add this
    const formattedData = data?.map((entry: any) => ({
      date: new Date(entry.created_at).toLocaleDateString(),
      price: entry.price,
    })) ?? [];

    setPriceData(formattedData);
  };

  fetchPriceHistory();
}, [id]);
// ------------------- FETCH EXTERNAL PRICES -------------------
// ------------------- FETCH EXTERNAL PRICES -------------------
useEffect(() => {
  if (!id) return;

  const fetchExternal = async () => {
    const { data, error } = await supabase
      .from("external_prices")
      .select("source, price, url, last_checked")
      .eq("item_id", id)
      .order("price", { ascending: true }); // lowest price first

    if (error) {
      console.error("Error fetching external prices:", error.message);
      return;
    }

    setExternalPrices(data || []);

    if (data && data.length > 0) {
      // pick the lowest price
      setBestExternal(data[0]);

      // Add external prices as last points in chart
      const externalChartPoints = data.map((p) => ({
        date: new Date(p.last_checked).toLocaleDateString(),
        price: p.price,
      }));

      setPriceData((prev) => [...prev, ...externalChartPoints]);
    }
  };

  fetchExternal();
}, [id]);

// ------------------- PRICE STATS -------------------
const priceStats = {
  lowest: priceData.length ? Math.min(...priceData.map(p => p.price)) : 0,
  highest: priceData.length ? Math.max(...priceData.map(p => p.price)) : 0,
  avg7: priceData.length
    ? Math.round(
        priceData.slice(-7).reduce((sum, p) => sum + p.price, 0) / Math.min(7, priceData.length)
      )
    : 0,
  avg30: priceData.length
    ? Math.round(
        priceData.slice(-30).reduce((sum, p) => sum + p.price, 0) / Math.min(30, priceData.length)
      )
    : 0,
};
  const percentChange = ...
// ----- MOMENTUM TAG CALCULATIONS -----
const recent = priceData.slice(-5); // last 5 data points
let momentumTag = "Sideways";

if (recent.length >= 2) {
  const first = recent[0].price;
  const last = recent[recent.length - 1].price;
  const diff = last - first;
  const pct = (diff / first) * 100;

  if (pct > 12) momentumTag = "Spiking";
  else if (pct > 5) momentumTag = "Pumping";
  else if (pct > -5 && pct < 5) momentumTag = "Sideways";
  else if (pct < -5 && pct > -12) momentumTag = "Cooling Off";
  else if (pct <= -12) momentumTag = "Crashing";
}

// ----- TREND CALCULATIONS -----
const lastPrice = priceData.length > 0 ? priceData[priceData.length - 1].price : null;
const price7DaysAgo =
  priceData.length > 7 ? priceData[priceData.length - 8].price : lastPrice;

const percentChange =
  lastPrice && price7DaysAgo
    ? ((lastPrice - price7DaysAgo) / price7DaysAgo) * 100
    : 0;

// ----- FLIP SCORE -----
const volatility =
  priceStats.highest - priceStats.lowest > item.price * 0.2
    ? "high"
    : priceStats.highest - priceStats.lowest > item.price * 0.1
    ? "medium"
    : "low";

const flipScore = Math.min(
  100,
  Math.max(
    1,
    80 +
      (percentChange > 0 ? percentChange * 0.5 : percentChange * 0.3) -
      (volatility === "high" ? 10 : 0)
  )
);

const recommendation =
  flipScore >= 70 ? "buy" : flipScore >= 40 ? "hold" : "sell";


  // ------------------- FETCH SOCIAL DATA -------------------
  useEffect(() => {
    const initSocial = async () => {
      const { data: auth } = await supabase.auth.getUser();
      setUser(auth.user);
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

  // ------------------- REALTIME UPDATES -------------------
  useEffect(() => {
    if (!id) return;
    let likesChannel: RealtimeChannel;
    let commentsChannel: RealtimeChannel;

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

  // ------------------- ACTIONS -------------------
  async function handleLike() {
    if (!user) return alert("Log in to like items.");
    if (!id) return;
    if (isLiked) {
      await supabase.from("likes").delete().eq("item_id", id).eq("user_id", user.id);
      setLikesCount((c) => c - 1);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be logged in to purchase.");
        router.push("/login");
        return;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: item.id,
          buyer_email: user.email,
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

  if (loading)
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="animate-spin w-8 h-8 text-gray-500" />
      </div>
    );

  if (!item) return <p className="p-6 text-center text-gray-600">Item not found.</p>;

  return (
    <main className="max-w-4xl mx-auto p-6">
      <button
        onClick={() => router.back()}
        className="flex items-center mb-4 text-gray-600 hover:text-black"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      {/* Item + Seller Card */}
      <div className="bg-white shadow-md rounded-2xl overflow-hidden mb-6">
        {item.image_url && (
          <img src={item.image_url} alt={item.title} className="w-full h-72 object-cover" />
        )}

        <div className="p-5">
          <h1 className="text-2xl font-bold mb-1">{item.title}</h1>
          <p className="text-gray-600 mb-3">{item.description}</p>
          <p className="text-xl font-bold mb-4">${item.price}</p>
<p className="text-xl font-bold mb-2">${item.price}</p>

{/* Price Stats */}
<div className="flex justify-between bg-gray-50 p-3 rounded-xl mb-2 text-sm text-gray-700">
  <div>
    <p className="text-gray-500">Lowest</p>
    <p className="font-semibold">${priceStats.lowest}</p>
  </div>
  <div>
    <p className="text-gray-500">Highest</p>
    <p className="font-semibold">${priceStats.highest}</p>
  </div>
  <div>
    <p className="text-gray-500">7-Day Avg</p>
    <p className="font-semibold">${priceStats.avg7}</p>
  </div>
  <div>
    <p className="text-gray-500">30-Day Avg</p>
    <p className="font-semibold">${priceStats.avg30}</p>
  </div>
</div>
{/* Trend Badge */}
<div className="my-3">
  <TrendBadge percentChange={percentChange} />
</div>

{/* Flip Score */}
<FlipScore
  score={Math.round(flipScore)}
  volatility={volatility as any}
  recommendation={recommendation as any}
/>
{/* Momentum Tag */}
<div className="my-3">
  <MomentumTag tag={momentumTag} />
</div>
<div className="flex gap-2 items-center mt-2">
  {/* Volatility */}
  <span className="text-sm text-gray-500">
    Volatility: <strong>{volatility}%</strong>
  </span>

  {/* FlipScore badge */}
  <span className={`px-2 py-1 rounded-full text-sm font-semibold ${getFlipScoreColor(flipScore)}`}>
    FlipScore: {flipScore}/100
  </span>
</div>

<div className="flex gap-4 items-center mt-2">
  <span className="text-sm text-gray-500">
    Volatility: <strong>{volatility}%</strong>
  </span>
  <span className="text-sm text-gray-500">
    FlipScore: <strong>{flipScore}/100</strong>
  </span>
</div>

{/* Best Price Across Internet */}
{bestExternal && (
  <div className="mb-4 p-4 bg-green-100 border-l-4 border-green-500 rounded-lg">
    <p className="text-sm text-gray-700">
      Best price across internet:{" "}
      <a
        href={bestExternal.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-green-800 underline"
      >
        ${bestExternal.price} ({bestExternal.source})
      </a>
    </p>
  </div>
)}
{bestExternal && (
  <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 rounded-md">
    <p className="text-sm text-gray-700">
      Best Price Across Internet: <strong>${bestExternal.price}</strong> on{" "}
      {bestExternal.source} 
      <a href={bestExternal.url} target="_blank" rel="noopener noreferrer" className="underline ml-1">
        View
      </a>
    </p>
  </div>
)}

{/* Price Chart */}
<div className="mb-4">
  {priceData.length > 0 ? (
    <PriceChart data={priceData} />
  ) : (
    <PriceChart data={sampleData} />
  )}
</div>






     {/* Seller Info */}
{item.seller && (
  <div
    className="flex items-center mb-4 gap-3 cursor-pointer hover:opacity-80"
    onClick={() => router.push(`/profile?user_id=${item.user_id}`)}
  >
    {item.seller.avatar_url ? (
      <img
        src={item.seller.avatar_url}
        className="w-10 h-10 rounded-full"
        alt={item.seller.username}
      />
    ) : (
      <div className="w-10 h-10 rounded-full bg-gray-300" />
    )}
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
          <button
            onClick={handleBuyNow}
            disabled={processing}
            className={`w-full py-3 rounded-xl font-medium text-white ${
              processing ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
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
          <input
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <button
            onClick={handlePostComment}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
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
                <span className="text-xs text-gray-400">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
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
              <div
                key={rel.id}
                onClick={() => router.push(`/item/${rel.id}`)}
                className="cursor-pointer bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition"
              >
                {rel.image_url && (
                  <img
                    src={rel.image_url}
                    alt={rel.title}
                    className="w-full h-40 object-cover rounded-lg mb-2"
                  />
                )}
                <h3 className="font-medium">{rel.title}</h3>
                <p className="font-semibold">${rel.price}</p>
              </div>
            ))}
          </div>
         {/* AI Recommendations */}
{recommendations.length > 0 && (
  <section className="mt-10">
    <h2 className="text-xl font-semibold mb-4">Recommended for You</h2>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {recommendations.map((rec) => (
        <div
          key={rec.id}
          onClick={() => router.push(`/item/${rec.id}`)}
          className="cursor-pointer bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition"
        >
          {rec.image_url && (
            <img
              src={rec.image_url}
              alt={rec.title}
              className="w-full h-40 object-cover rounded-lg mb-2"
            />
          )}
          <h3 className="font-medium">{rec.title}</h3>
          <p className="font-semibold">${rec.price}</p>

          {/* External Price */}
          {rec.externalPrice && (
            <p className="text-xs text-green-600">
              ${rec.externalPrice} on {rec.externalSource}
            </p>
          )}

          {/* AI Score / FlipScore */}
          <div
            className={`mt-2 px-2 py-1 text-xs font-semibold rounded-full ${
              rec.aiScore >= 75
                ? "bg-green-500 text-white"
                : rec.aiScore >= 50
                ? "bg-yellow-400 text-black"
                : "bg-red-500 text-white"
            }`}
          >
            AI Score: {rec.aiScore} ({rec.momentumPct?.toFixed(1)}%)
          </div>
        </div>
      ))}
    </div>
  </section>
)}

      {recommendations.length > 0 && (
  <section className="mt-10">
    <h2 className="text-xl font-semibold mb-4">Recommended for You</h2>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {recommendations.map((rec) => (
        <div
          key={rec.id}
          onClick={() => router.push(`/item/${rec.id}`)}
          className="cursor-pointer bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition"
        >
          {rec.image_url && (
            <img
              src={rec.image_url}
              alt={rec.title}
              className="w-full h-40 object-cover rounded-lg mb-2"
            />
          )}
          <h3 className="font-medium">{rec.title}</h3>
          <p className="font-semibold">${rec.price}</p>
        </div>
      ))}
    </div>
  </section>
)}

      )}
    </main>
  );
}
