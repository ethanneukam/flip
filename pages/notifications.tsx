import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import AuthWrapper from "../components/AuthWrapper";
import Link from "next/link";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*, actor:profiles!actor_id(username, avatar_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) setNotifications(data);
  };

  return (
    <AuthWrapper>
      <main className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Notifications</h1>

        {notifications.length === 0 ? (
          <p>No notifications yet.</p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`border p-3 rounded ${
                  n.is_read ? "bg-white" : "bg-blue-50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  {n.actor?.avatar_url && (
                    <img
                      src={n.actor.avatar_url}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <p>{n.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AuthWrapper>
  );
}