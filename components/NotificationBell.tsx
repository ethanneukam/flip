// components/NotificationBell.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { subscribeToNotifications } from "../lib/realtimeClient";

interface NotificationBellProps {
  className?: string; // allow passing className
}

export const NotificationBell = ({ className }: NotificationBellProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count: unread } = await supabase
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .eq("read", false);

      setCount(unread || 0);

      subscribeToNotifications(user.id, () => setCount((c) => c + 1));
    };
    setup();
  }, []);

  return (
    <button className={`relative ${className || ""}`}>
      🔔
      {count > 0 && (
        <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs px-1.5 rounded-full">
          {count}
        </span>
      )}
    </button>
  );
};