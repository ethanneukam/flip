import { supabase } from "./supabaseClient";

export async function sendNotification({
  user_id,
  actor_id,
  type,
  item_id = null,
  message,
}) {
  const { error } = await supabase.from("notifications").insert([
    { user_id, actor_id, type, item_id, message },
  ]);

  if (error) console.error("Error sending notification:", error);
}