import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import { useUser } from "@supabase/auth-helpers-react";
import { sendNotification } from "../../lib/notifications";

// ✅ First Component: PublicProfilePage
export default function PublicProfilePage() {
  const router = useRouter();
  const { username } = router.query;

  const [profile, setProfile] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [ratingSummary, setRatingSummary] = useState<{ avg: string | null; count: number }>({
    avg: null,
    count: 0,
  });

  useEffect(() => {
    if (username) fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    setLoading(true);

    // 1️⃣ Get the profile by username
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single();

    if (profileError || !profileData) {
      console.error(profileError);
      setLoading(false);
      return;
    }

    setProfile(profileData);

    // ✅ Fetch user’s items
    const { data: items } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", profile.id);
   setItems(items || []);

    // ✅ Fetch reviews + reviewer profiles
    const { data: reviewsData } = await supabase
      .from("reviews")
      .select(
        "id, rating, comment, created_at, reviewer:reviewer_id(username, avatar_url)"
      )
    .eq("reviewed_user_id", profile.id)
      .order("created_at", { ascending: false });
    setReviews(reviewsData || []);

    // ✅ Calculate rating summary
    if (reviewsData && reviewsData.length > 0) {
      const total = reviewsData.reduce((sum, r) => sum + r.rating, 0);
      const avg = total / reviewsData.length;
      setRatingSummary({ avg: avg.toFixed(1), count: reviewsData.length });
    } else {
      setRatingSummary({ avg: null, count: 0 });
    }

    setLoading(false);
  };

  // ✅ Fetch ratings summary
  const { data: reviewsData } = await supabase
    .from("reviews")
    .select("rating")
    .eq("reviewed_user_id", user.id);
  if (reviewsData && reviewsData.length > 0) {
    const total = reviewsData.reduce((sum, r) => sum + r.rating, 0);
    const avg = total / reviewsData.length;
    setRatingSummary({ avg: avg.toFixed(1), count: reviewsData.length });
  } else {
    setRatingSummary({ avg: null, count: 0 });
  }

  // 2️⃣ Get items listed by this user
  const { data: itemData } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", profileData.id)
    .order("created_at", { ascending: false });
  setItems(itemData || []);

  // 3️⃣ Get reviews for this user
  const { data: reviewData } = await supabase
    .from("reviews")
    .select(
      `id, rating, comment, created_at, reviewer:reviewer_id ( username, avatar_url )`
    )
    .eq("reviewed_user_id", profileData.id)
    .order("created_at", { ascending: false });
  setReviews(reviewData || []);
  setLoading(false);

  if (loading) return <p className="p-6">Loading...</p>;
  if (!profile) return <p className="p-6">User not found.</p>;

  useEffect(() => {
    fetchUserAndFollowStatus();
  }, [username]);

  const fetchUserAndFollowStatus = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (!user) return;

    // Get the profile being viewed
    const { data: viewedProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single();

    if (!viewedProfile) return;

    // Check if following
    const { data: followData } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", user.id)
      .eq("following_id", viewedProfile.id)
      .maybeSingle();
    setIsFollowing(!!followData);

    // Get counts
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", viewedProfile.id),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", viewedProfile.id),
    ]);
    setFollowerCount(followers || 0);
    setFollowingCount(following || 0);
  };

  const toggleFollow = async () => {
    if (!currentUser) return alert("Please log in to follow users.");

    const { data: viewedProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single();

    if (!viewedProfile) return;

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUser.id)
        .eq("following_id", viewedProfile.id);
      if (!error) {
        setIsFollowing(false);
        setFollowerCount((c) => c - 1);
      }
    } else {
      const { error } = await supabase.from("follows").insert([
        {
          follower_id: currentUser.id,
          following_id: viewedProfile.id,
        },
      ]);
      if (!error) {
        setIsFollowing(true);
        setFollowerCount((c) => c + 1);

        // 🔔 Send notification
        await sendNotification({
          user_id: viewedProfile.id,
          actor_id: currentUser.id,
          type: "follow",
          message: `${currentUser.user_metadata.username} started following you.`,
        });
      }
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      {/* 👤 Profile Header */}
      <section className="flex items-center space-x-4">
        <img
          src={profile.avatar_url || "/default-avatar.png"}
          alt={profile.username}
          className="w-24 h-24 rounded-full object-cover"
        />
        <div>
          <h1 className="text-2xl font-bold">@{profile.username}</h1>
          {ratingSummary.avg ? (
            <p className="text-yellow-500 font-semibold">
              ⭐ {ratingSummary.avg}{" "}
              <span className="text-gray-600">
                ({ratingSummary.count} reviews)
              </span>
            </p>
          ) : (
            <p className="text-gray-500">No reviews yet</p>
          )}
        </div>
      </section>

      {/* 🛍️ Items Section */}
      <section>
        <h2 className="text-xl font-semibold mb-3">
          {profile.username}’s Listings
        </h2>
        {items.length === 0 ? (
          <p className="text-gray-500">No items listed yet.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((item) => (
              <li
                key={item.id}
                className="border p-3 rounded hover:shadow-lg transition"
              >
                <Link href={`/item/${item.id}`}>
                  <div>
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-40 object-cover mb-2 rounded"
                      />
                    )}
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-gray-600 line-clamp-2">
                      {item.description}
                    </p>
                    <p className="font-bold">${item.price}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ⭐ Reviews Section */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Ratings & Reviews</h2>
        {/* Leave a Review Form */}
        {user && profile.id !== user.id && (
          <div className="border p-4 rounded-lg bg-gray-50 mb-6">
            <h3 className="font-semibold mb-2">Leave a Review</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const rating = parseInt(e.target.rating.value);
                const comment = e.target.comment.value.trim();
                if (!rating) return alert("Please select a rating.");

                const { error } = await supabase.from("reviews").insert([
                  {
                    reviewer_id: user.id,
                    reviewed_user_id: profile.id,
                    rating,
                    comment,
                  },
                ]);

                if (error) {
                  console.error(error);
                  alert("Error submitting review.");
                } else {
                  e.target.reset();
                  fetchProfile();
                  alert("Review submitted!");
                }
              }}
            >
              <select
                name="rating"
                className="border rounded p-2 mb-2 w-full"
                defaultValue=""
              >
                <option value="" disabled>
                  Choose rating
                </option>
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>
                    {r} ⭐
                  </option>
                ))}
              </select>
              <textarea
                name="comment"
                placeholder="Leave a comment (optional)"
                className="border rounded p-2 w-full mb-2"
              />
              <button
                type="submit"
                className="bg-black text-white px-4 py-2 rounded w-full"
              >
                Submit Review
              </button>
            </form>
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="flex space-x-4">
            <p>
              <span className="font-bold">{followerCount}</span> Followers
            </p>
            <p>
              <span className="font-bold">{followingCount}</span> Following
            </p>
          </div>
          {currentUser?.user_metadata?.username !== username && (
            <button
              onClick={toggleFollow}
              className={`px-4 py-2 rounded text-white ${
                isFollowing
                  ? "bg-gray-500 hover:bg-gray-600"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isFollowing ? "Unfollow" : "Follow"}
            </button>
          )}
        </div>

        {/* Display Reviews */}
        {reviews.length === 0 ? (
          <p className="text-gray-500">No reviews yet.</p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="border p-4 rounded-lg bg-white shadow-sm"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <img
                    src={review.reviewer?.avatar_url || "/default-avatar.png"}
                    alt={review.reviewer?.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <p className="font-semibold">
                    @{review.reviewer?.username || "Anonymous"}
                  </p>
                </div>
                <div className="flex items-center mb-1">
                  {"⭐".repeat(review.rating)}
                </div>
                {review.comment && (
                  <p className="text-gray-700">{review.comment}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

// ✅ Second Component: UserProfilePage
export function UserProfilePage() {
  const router = useRouter();
  const { username } = router.query;

  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (!username) return;
    fetchData();
  }, [username]);

  async function fetchData() {
    const { data: user } = await supabase.auth.getUser();
    setCurrentUser(user?.user);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single();
    setProfile(profileData);

    if (profileData) {
      const { data: listings } = await supabase
        .from("items")
        .select("*")
        .eq("owner_id", profileData.id)
        .order("created_at", { ascending: false });
      setItems(listings);

      const { data: reviewData } = await supabase
        .from("reviews")
        .select("*, reviewer:profiles(username, avatar_url)")
        .eq("seller_id", profileData.id);
      setRatings(reviewData);

      if (user?.user?.id) {
        const { data: follow } = await supabase
          .from("followers")
          .select("*")
          .eq("follower_id", user.user.id)
          .eq("following_id", profileData.id)
          .maybeSingle();
        setIsFollowing(!!follow);
      }
    }
  }

  async function toggleFollow() {
    if (!currentUser || !profile) return;

    if (isFollowing) {
      await supabase
        .from("followers")
        .delete()
        .eq("follower_id", currentUser.id)
        .eq("following_id", profile.id);
    } else {
      await supabase
        .from("followers")
        .insert({ follower_id: currentUser.id, following_id: profile.id });
    }
    setIsFollowing(!isFollowing);
  }

  if (!profile) return <p>Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <img
          src={profile.avatar_url || "/default-avatar.png"}
          alt="avatar"
          className="w-20 h-20 rounded-full"
        />
        <div>
          <h1 className="text-2xl font-bold">{profile.username}</h1>
          <p className="text-gray-600">{profile.bio || "No bio yet."}</p>
          {currentUser?.id !== profile.id && (
            <button
              onClick={toggleFollow}
              className="mt-2 px-4 py-1 bg-blue-600 text-white rounded-lg"
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-8 text-gray-700 mb-6">
        <span>⭐ {ratings.length} Reviews</span>
        <span>📦 {items.length} Listings</span>
      </div>

      {/* Listings */}
      <h2 className="font-semibold text-lg mb-3">Items for Sale</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-3 shadow-sm">
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.title}
                className="rounded-lg mb-2"
              />
            )}
            <h3 className="font-semibold">{item.title}</h3>
            <p className="text-gray-700">${item.price}</p>
          </div>
        ))}
      </div>

      {/* Reviews */}
      <h2 className="font-semibold text-lg mt-6 mb-3">Ratings & Reviews</h2>
      {ratings.map((r) => (
        <div key={r.id} className="border-t py-2">
          <div className="flex items-center gap-2">
            <img
              src={r.reviewer?.avatar_url || "/default-avatar.png"}
              className="w-6 h-6 rounded-full"
            />
            <span className="font-medium">{r.reviewer?.username}</span>
          </div>
          <p className="text-sm text-gray-700">{r.comment}</p>
          <p className="text-yellow-500">⭐ {r.rating}/5</p>
        </div>
      ))}
    </div>
  );
}
