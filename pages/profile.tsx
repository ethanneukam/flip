import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import AuthWrapper from "../components/AuthWrapper";
import LogoutButton from "../components/LogoutButton";
import Link from "next/link";
import { useRouter } from "next/router";
import BottomNav from "../components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    username: "",
    avatar_url: "",
    bio: "",
    instagram: "",
    tiktok: "",
    youtube: "",
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "favorites" | "reviews">(
    "posts"
  );
  const [reviews, setReviews] = useState<any[]>([]);
  const [ratingSummary, setRatingSummary] = useState({
    avg: null as string | null,
    count: 0,
  });
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);


  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await getProfile(user.id);
      await fetchFavorites(user.id);
      await fetchReviews(user.id);
      await fetchRatingSummary(user.id);
      await fetchFollowCounts(user.id);
      await fetchUserPosts(user.id);
      setupRealtime(user.id);
    };
    fetchData();
  }, []);

  // ---------- Profile ----------
  const getProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("username, avatar_url, bio, instagram, tiktok, youtube")
      .eq("id", userId)
      .single();
    if (error) console.error(error);
    else setProfile(data);
  };
const router = useRouter();
const { user_id } = router.query;

useEffect(() => {
  if (!user_id) return;

  // fetch profile info for user_id
}, [user_id]);

  // ---------- Follows ----------
  const fetchFollowCounts = async (userId: string) => {
    const { count: followersCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId);

    const { count: followingCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId);

    setFollowerCount(followersCount || 0);
    setFollowingCount(followingCount || 0);
  };

  const fetchFollowersList = async (userId: string) => {
    const { data, error } = await supabase
      .from("follows")
      .select("follower_id, profiles!follower_id(username, avatar_url)")
      .eq("following_id", userId);
    if (!error) setFollowersList(data.map((f) => f.profiles));
  };

  const fetchFollowingList = async (userId: string) => {
    const { data, error } = await supabase
      .from("follows")
      .select("following_id, profiles!following_id(username, avatar_url)")
      .eq("follower_id", userId);
    if (!error) setFollowingList(data.map((f) => f.profiles));
  };

  const setupRealtime = async (userId: string) => {
    const channel = supabase
      .channel("realtime-follows")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follows" },
        () => fetchFollowCounts(userId)
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  };

  // ---------- Posts ----------
  const fetchUserPosts = async (userId: string) => {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error) setPosts(data);
  };

  // ---------- Favorites ----------
  const fetchFavorites = async (userId: string) => {
    const { data, error } = await supabase
      .from("favorites")
      .select("item_id, items(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error) setFavorites(data.map((r) => r.items));
  };

  // ---------- Reviews ----------
  const fetchReviews = async (userId: string) => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*, reviewer:profiles(username, avatar_url)")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false });
    if (!error) setReviews(data);
  };

  const fetchRatingSummary = async (userId: string) => {
    const { data: reviewsData } = await supabase
      .from("reviews")
      .select("rating")
      .eq("reviewed_user_id", userId);
    if (reviewsData && reviewsData.length > 0) {
      const total = reviewsData.reduce((sum, r) => sum + r.rating, 0);
      const avg = total / reviewsData.length;
      setRatingSummary({ avg: avg.toFixed(1), count: reviewsData.length });
    }
  };

  // ---------- Upload Avatar ----------
  const uploadAvatar = async (event: any) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setProfile((prev) => ({ ...prev, avatar_url: data.publicUrl }));
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  // ---------- Modal UI ----------
  const Modal = ({ title, list, onClose }: any) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-80 max-h-[80vh] overflow-y-auto p-4">
        <h2 className="text-xl font-semibold mb-3">{title}</h2>
        <button onClick={onClose} className="absolute top-3 right-4 text-gray-500">
          ✕
        </button>
        {list.length === 0 ? (
          <p className="text-gray-500 text-center">No users yet</p>
        ) : (
          <ul className="space-y-3">
            {list.map((u) => (
              <li key={u.username} className="flex items-center space-x-3">
                <img
                  src={u.avatar_url || "/default-avatar.png"}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <p className="font-medium">{u.username}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <AuthWrapper>
      <main className="max-w-md mx-auto pb-24">
        {/* --- Banner --- */}
        <div className="relative w-full h-36 bg-gray-300">
          {profile.avatar_url && (
            <img
              src={profile.avatar_url}
              className="absolute inset-0 w-full h-full object-cover blur-sm opacity-70"
            />
          )}
          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
            <img
              src={profile.avatar_url || "/default-avatar.png"}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
            />
          </div>
        </div>

        {/* --- Info --- */}
        <div className="mt-16 text-center px-4">
          <h1 className="text-2xl font-bold">{profile.username}</h1>
          <p className="text-gray-600 text-sm mt-1">{profile.bio}</p>

      <button
  onClick={() => router.push("/edit-profile")}
  className="px-4 py-2 bg-black text-white rounded-lg"
>
  Edit Profile
</button>

          {/* --- Stats --- */}
          <div className="flex justify-around items-center text-center mt-6">
            <div onClick={() => { setShowFollowersModal(true); fetchFollowersList(profile.id); }} className="cursor-pointer">
              <p className="text-lg font-semibold">{followerCount}</p>
              <p className="text-gray-500 text-sm">Followers</p>
            </div>
            <div onClick={() => { setShowFollowingModal(true); fetchFollowingList(profile.id); }} className="cursor-pointer">
              <p className="text-lg font-semibold">{followingCount}</p>
              <p className="text-gray-500 text-sm">Following</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{ratingSummary.count}</p>
              <p className="text-gray-500 text-sm">Reviews</p>
            </div>
          </div>
        </div>

        {/* --- Tabs --- */}
        <div className="flex justify-around border-b mt-6">
          {["posts", "favorites", "reviews"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-3 w-full font-medium ${
                activeTab === tab
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* --- Tab Content --- */}
        <div className="p-4">
          <AnimatePresence mode="wait">
            {activeTab === "posts" && (
              <motion.div
                key="posts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-3 gap-2"
              >
                {posts.length === 0 ? (
                  <p className="col-span-3 text-center text-gray-500">
                    No posts yet.
                  </p>
                ) : (
                  posts.map((p) => (
                    <Link key={p.id} href={`/item/${p.id}`}>
                      <img
                        src={p.image_url}
                        className="w-full h-32 object-cover rounded-lg hover:scale-105 transition"
                      />
                    </Link>
                  ))
                )}
              </motion.div>
            )}

            {activeTab === "favorites" && (
              <motion.div
                key="favorites"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-2 gap-3"
              >
                {favorites.length === 0 ? (
                  <p className="col-span-2 text-center text-gray-500">
                    No favorites yet.
                  </p>
                ) : (
                  favorites.map((f) => (
                    <Link key={f.id} href={`/item/${f.id}`}>
                      <img
                        src={f.image_url}
                        className="w-full h-36 object-cover rounded-xl hover:scale-105 transition"
                      />
                    </Link>
                  ))
                )}
              </motion.div>
            )}

            {activeTab === "reviews" && (
              <motion.div
                key="reviews"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {reviews.length === 0 ? (
                  <p className="text-center text-gray-500">
                    No reviews yet.
                  </p>
                ) : (
                  reviews.map((r) => (
                    <div key={r.id} className="border rounded-lg p-3 shadow-sm">
                      <div className="flex items-center space-x-3 mb-2">
                        <img
                          src={r.reviewer?.avatar_url}
                          className="w-8 h-8 rounded-full"
                        />
                        <p className="font-semibold">{r.reviewer?.username}</p>
                        <span className="text-yellow-500">
                          {"⭐".repeat(r.rating)}
                        </span>
                      </div>
                      <p className="text-gray-700">{r.comment}</p>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {showFollowersModal && (
          <Modal
            title="Followers"
            list={followersList}
            onClose={() => setShowFollowersModal(false)}
          />
        )}
        {showFollowingModal && (
          <Modal
            title="Following"
            list={followingList}
            onClose={() => setShowFollowingModal(false)}
          />
        )}

        <BottomNav />
      </main>
    </AuthWrapper>
  );
}