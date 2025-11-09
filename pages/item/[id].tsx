import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Heart, Star, ArrowLeft, MessageSquare, Loader2 } from "lucide-react";
import { RealtimeChannel } from "@supabase/supabase-js";

export default function ItemDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [item, setItem] = useState<any>(null);
  const [relatedItems, setRelatedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [marking, setMarking] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

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

      {/* Item Card */}
      <div className="bg-white shadow-md rounded-2xl overflow-hidden">
        {item.image_url && (
          <img src={item.image_url} alt={item.title} className="w-full h-72 object-cover" />
        )}

        <div className="p-5">
          <h1 className="text-2xl font-bold mb-1">{item.title}</h1>
          <p className="text-gray-600 mb-3">{item.description}</p>
          <p className="text-xl font-bold mb-4">${item.price}</p>

          <div className="flex items-center gap-4 mb-6">
            <button onClick={handleLike} className="flex items-center gap-1 text-lg">
              <Heart className={`w-5 h-5 ${isLiked ? "fill-red-500 text-red-500" : "text-gray-500"}`} /> {likesCount}
            </button>
            <button onClick={handleFavorite} className="flex items-center gap-1 text-lg">
              <Star className={`w-5 h-5 ${isFavorited ? "fill-yellow-400 text-yellow-400" : "text-gray-500"}`} />
            </button>
          </div>

          <button
            onClick={() => alert("Buy flow coming soon")}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
          >
            Buy Now
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
                  <strong>{comment.profiles?.username || "User"}:</strong>{" "}
                  {comment.content}
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
        </section>
      )}
    </main>
  );
}