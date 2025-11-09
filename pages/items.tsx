import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";

export default function ItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, number>>({});
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    const getItems = async () => {
      const res = await fetch("/api/items");
      const data = await res.json();
      setItems(data || []);
      setLoading(false);
      fetchLikesAndComments(data);
    };

    getUser();
    getItems();
  }, []);

  const fetchLikesAndComments = async (items: any[]) => {
    const itemIds = items.map((i) => i.id);

    // Get like counts
    const { data: likeData } = await supabase
      .from("likes")
      .select("item_id, count:id")
      .in("item_id", itemIds)
      .group("item_id");

    // Get comment counts
    const { data: commentData } = await supabase
      .from("comments")
      .select("item_id, count:id")
      .in("item_id", itemIds)
      .group("item_id");

    const likeMap: Record<string, number> = {};
    const commentMap: Record<string, number> = {};
    likeData?.forEach((row: any) => (likeMap[row.item_id] = row.count));
    commentData?.forEach((row: any) => (commentMap[row.item_id] = row.count));

    setLikes(likeMap);
    setComments(commentMap);

    // Get which items user liked
    if (user?.id) {
      const { data: userLikeData } = await supabase
        .from("likes")
        .select("item_id")
        .eq("user_id", user.id);
      const userLikeMap: Record<string, boolean> = {};
      userLikeData?.forEach((l) => (userLikeMap[l.item_id] = true));
      setUserLikes(userLikeMap);
    }
  };

  const handleLike = async (itemId: string) => {
    if (!user?.id) return alert("You must be logged in.");

    const alreadyLiked = userLikes[itemId];

    if (alreadyLiked) {
      await supabase.from("likes").delete().match({ item_id: itemId, user_id: user.id });
      setUserLikes((prev) => ({ ...prev, [itemId]: false }));
      setLikes((prev) => ({ ...prev, [itemId]: (prev[itemId] || 1) - 1 }));
    } else {
      await supabase.from("likes").insert({ item_id: itemId, user_id: user.id });
      setUserLikes((prev) => ({ ...prev, [itemId]: true }));
      setLikes((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
    }
  };

  const handleComment = async (itemId: string) => {
    const content = prompt("Add a comment:");
    if (!content) return;
    if (!user?.id) return alert("You must be logged in.");

    await supabase.from("comments").insert({ item_id: itemId, user_id: user.id, content });
    setComments((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };

  const handleItemClick = (itemId: string) => {
    router.push(`/item/${itemId}`);
  };

  const handleBuyNow = async (itemId: string) => {
    if (!user?.email) {
      alert("You must be logged in to purchase.");
      return;
    }

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId, buyer_email: user.email }),
    });

    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert(data.error || "Something went wrong");
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Marketplace</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            className="border rounded-lg shadow-sm p-4 flex flex-col justify-between hover:shadow-lg cursor-pointer transition"
          >
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-48 object-cover rounded mb-3"
              />
            )}

            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="text-gray-600 mb-2">{item.description}</p>
            <p className="font-bold mb-2">${item.price}</p>

            {item.profiles && (
              <div className="text-sm text-gray-500 mb-3">
                Seller: {item.profiles.id}
                {item.profiles.verified && (
                  <span className="ml-2 text-green-600 font-semibold">✅ Verified</span>
                )}
                {item.profiles.seller_badge && (
                  <span className="ml-2 bg-yellow-300 text-black px-2 py-1 rounded text-xs">
                    {item.profiles.seller_badge}
                  </span>
                )}
              </div>
            )}

            <div className="flex justify-between items-center mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike(item.id);
                }}
                className="text-red-500 hover:text-red-700"
              >
                ❤️ {likes[item.id] || 0}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleComment(item.id);
                }}
                className="text-blue-500 hover:text-blue-700"
              >
                💬 {comments[item.id] || 0}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBuyNow(item.id);
                }}
                className="bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700"
              >
                Buy Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}