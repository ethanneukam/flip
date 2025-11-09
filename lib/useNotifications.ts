import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export const useNotifications = (userId: string) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetchCount = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);
      setCount(count || 0);
    };

    fetchCount();

    const sub = supabase
      .channel("realtime:notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, fetchCount)
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [userId]);

  return count;
};