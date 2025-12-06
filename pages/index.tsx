import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";
import AuthWrapper from "../components/AuthWrapper";
import BottomNav from "../components/BottomNav";
import { MessageCircle, Repeat, User, Plus, Grid, List } from "lucide-react";

export default function Home() {
  return (
    <AuthWrapper>
      <MarketplaceContent />
    </AuthWrapper>
  );
}

function MarketplaceContent() {
  const [items, setItems] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [loading, setLoading] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [commentingItem, setCommentingItem] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  // ✅ Get user session & ensure wallet
  useEffect(() => {
    const initUserAndWallet = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) return console.error("Error getting user:", error);
      if (!data.user) return;

      setUser(data.user);

      const { data: existingWallet } = await supabase
        .from("flip_wallets")
        .select("*")
        .eq("user_id", data.user.id)
        .single();

      if (!existingWallet) {
        await supabase.from("flip_wallets").insert({ user_id: data.user.id, balance: 0 });
      }

      const { data: favData } = await supabase
        .from("favorites")
        .select("item_id")
        .eq("user_id", data.user.id);
      if (favData) setFavorites(favData.map((f) => f.item_id));
    };

    initUserAndWallet();
  }, []);

  // ✅ Fetch profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase.from("profiles").select("id, username, avatar_url");
      if (error) console.error("Error fetching profiles:", error);
      else setProfiles(data || []);
    };
    fetchProfiles();
  }, []);

  // ✅ Fetch items with counts
  const fetchItems = async () => {
    const { data: itemsData, error } = await supabase
      .from("items")
      .select(`*, profiles(username, avatar_url)`)
      .order("created_at", { ascending: false });

    if (error) return console.error("Error fetching items:", error);

    const { data: likesData } = await supabase
      .from("likes")
      .select("item_id, count:id", { count: "exact" })
      .group("item_id");

    const { data: commentsData } = await supabase
      .from("comments")
      .select("item_id, count:id", { count: "exact" })
      .group("item_id");

    const likesCountMap = Object.fromEntries((likesData || []).map((l) => [l.item_id, l.count]));
    const commentsCountMap = Object.fromEntries((commentsData || []).map((c) => [c.item_id, c.count]));

    const mergedItems = (itemsData || []).map((item) => ({
      ...item,
      likes_count: likesCountMap[item.id] || 0,
      comments_count: commentsCountMap[item.id] || 0,
    }));

    setItems(mergedItems);
  };

  // 🔹 Filters & search
  const fetchFilteredItems = async () => {
    setLoading(true);
    let query = supabase.from("items").select("*").order("created_at", { ascending: false });

    if (searchQuery.trim()) {
      try {
        const aiResponse = await fetch("/api/findSearch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery }),
        });
        const aiData = await aiResponse.json();
        if (aiData.results && aiData.results.length > 0) {
          setItems(aiData.results);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("AI search failed, falling back:", err);
      }
      query = query.ilike("title", `%${searchQuery}%`);
    }

    if (selectedCategory !== "all") query = query.eq("category", selectedCategory);
    if (minPrice) query = query.gte("price", minPrice);
    if (maxPrice) query = query.lte("price", maxPrice);

    if (sortOption === "price_low_high") query = query.order("price", { ascending: true });
    else if (sortOption === "price_high_low") query = query.order("price", { ascending: false });
    else if (sortOption === "newest") query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) console.error("Error fetching items:", error.message);
    else setItems(data || []);

    setLoading(false);
  };

  useEffect(() => {
    fetchFilteredItems();
  }, [searchQuery, selectedCategory, minPrice, maxPrice, sortOption]);

  // 🔁 Realtime subscriptions
  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel("realtime-likes-comments")
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, fetchItems)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, fetchItems)
      .subscribe();

    const itemChannel = supabase
      .channel("realtime-items")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, fetchItems)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(itemChannel);
    };
  }, []);

  const filteredItems = showFavoritesOnly ? items.filter((i) => favorites.includes(i.id)) : items;

  // ❤️ Favorite toggle
  const toggleFavorite = async (itemId: string) => {
    if (!user) return alert("Login to favorite items.");
    const isFav = favorites.includes(itemId);

    if (isFav) {
      setFavorites((prev) => prev.filter((id) => id !== itemId));
      await supabase.from("favorites").delete().eq("item_id", itemId).eq("user_id", user.id);
    } else {
      setFavorites((prev) => [...prev, itemId]);
     await supabase.from("favorites").insert([{ user_id: user.id, item_id: itemId }]);
    }
  };

  // 💬 Like + Comment
  const handleLike = async (itemId: string) => {
    if (!user) return alert("Login to like items.");
    const { data: existing } = await supabase
      .from("likes")
      .select("*")
      .eq("item_id", itemId)
      .eq("user_id", user.id)
      .single();

    if (existing) await supabase.from("likes").delete().eq("id", existing.id);
await supabase.from("likes").insert({ item_id: itemId, user_id: user.id });

    fetchItems();
  };

  const handleComment = async (itemId: string, text: string) => {
    if (!user) return;
    await supabase.from("comments").insert({
  item_id: itemId,
  user_id: user.id,
  text,
});
};

  const openComments = (itemId: string) => setCommentingItem(itemId);
  const submitComment = async () => {
    if (!commentingItem || !commentText.trim()) return;
    await handleComment(commentingItem, commentText);
    setCommentText("");
    setCommentingItem(null);
  };

  return (
    <>
      {commentingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-lg">
            <h3 className="text-lg font-semibold mb-3">Add a Comment</h3>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Type your comment..."
              className="w-full border rounded-lg p-2 mb-3"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setCommentingItem(null)} className="text-gray-500">
                Cancel
              </button>
              <button onClick={submitComment} className="bg-blue-600 text-white px-4 py-1 rounded-full">
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="p-6 max-w-3xl mx-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4 relative">
          {/* Left: Flip Title */}
          <h1 className="text-2xl font-bold">Flip</h1>

          {/* Center: Upload Button */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <Link
              href="/upload"
              className="bg-blue-600 text-white px-4 md:px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition flex items-center space-x-1"
            >
              <Plus size={16} />
              <span className="hidden md:inline">Upload</span>
            </Link>
          </div>

          {/* Right: Grid/List Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded ${viewMode === "grid" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded ${viewMode === "list" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border rounded px-3 py-2 w-full sm:w-64"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">All Categories</option>
            <option value="cars">Cars</option>
            <option value="tech">Tech</option>
            <option value="fashion">Fashion</option>
            <option value="collectibles">Collectibles</option>
          </select>
          <input
            type="number"
            placeholder="Min Price"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="border rounded px-3 py-2 w-24"
          />
          <input
            type="number"
            placeholder="Max Price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="border rounded px-3 py-2 w-24"
          />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="newest">Newest</option>
            <option value="price_low_high">Price: Low → High</option>
            <option value="price_high_low">Price: High → Low</option>
          </select>
        </div>

        {/* Marketplace Feed */}
        <ul className="flex flex-col gap-6">
          {filteredItems?.length ? (
            filteredItems.map((item) => (
              <li key={item.id} className="border rounded-2xl shadow-sm p-4 relative hover:shadow-md transition">
                <Link href={`/item/${item.id}`} className="block cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={item.profiles?.avatar_url || "/default-avatar.png"}
                      alt="User"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-sm">{item.profiles?.username || "Anonymous"}</h3>
                      <p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
<div className="p-4 border rounded shadow mb-4 relative">
      <h3 className="font-bold text-lg">{item.title}</h3>
      <p className="text-gray-700">{item.description}</p>

      {/* Flip Coins earned for this listing */}
      {item.coinsEarned && (
        <div className="absolute top-2 right-2 bg-yellow-300 text-black px-2 py-1 rounded-full text-sm font-semibold">
          +{item.coinsEarned} FC
        </div>
      )}
    </div>
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full rounded-lg object-cover mb-3 max-h-[400px]"
                    />
                  )}

                  <h2 className="text-lg font-bold">{item.title}</h2>
                  <p className="text-gray-700">{item.description}</p>
                  <p className="text-blue-600 font-bold mt-1">${item.price}</p>
                </Link>

                <div className="flex justify-between items-center mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(item.id);
                    }}
                    className="flex items-center gap-1 text-gray-600"
                  >
                    ❤️ {item.likes_count || 0}
                  </button>

                  <button
                    onClick={() => openComments(item.id)}
                    className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition"
                  >
                    💬 {item.comments_count || 0}
                  </button>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleFavorite(item.id);
                  }}
                  className={`absolute top-2 right-2 text-xl ${favorites.includes(item.id) ? "text-red-500" : "text-gray-400"}`}
                >
                  ♥
                </button>
              </li>
            ))
          ) : (
            <p className="text-center text-gray-500 mt-4">No items to display.</p>
          )}
        </ul>

        <BottomNav />
      </main>
    </>
  );
}
