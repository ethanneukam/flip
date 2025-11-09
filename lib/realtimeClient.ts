import { supabase } from "./supabaseClient";

export const subscribeToNotifications = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel("notifications")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      (payload) => callback(payload.new)
    )
    .subscribe();
};

export const subscribeToMessages = (chatId: string, callback: (payload: any) => void) => {
  return supabase
    .channel("messages")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
      (payload) => callback(payload.new)
    )
    .subscribe();
};