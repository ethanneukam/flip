import { supabase } from "../../lib/supabaseClient";

export default async function handler(req, res) {
  // ---------------------- POST (create order) ----------------------
  if (req.method === "POST") {
    const { item_id, buyer_id, seller_id, total } = req.body;

    const { data, error } = await supabase
      .from("orders")
      .insert([{ item_id, buyer_id, seller_id, total }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // Create notification for seller
    await supabase.from("notifications").insert([
      {
        user_id: seller_id,
        type: "order",
        actor_id: buyer_id,
        item_id,
        message: "You have a new order!",
      },
    ]);

    return res.status(200).json({ order: data });
  }

  // ---------------------- PATCH (update status) ----------------------
  if (req.method === "PATCH") {
    const { order_id, status } = req.body;

    const { data, error } = await supabase
      .from("orders")
      .update({ status, updated_at: new Date() })
      .eq("id", order_id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    const buyer_id = data.buyer_id;
    const seller_id = data.seller_id;

    // ⬅️ FIXED: Delivered trust update (moved inside PATCH where variables exist)
    if (status === "delivered") {
      await supabase
        .from("flipid_trust")
        .update({
          total_sales: supabase.raw("total_sales + 1"),
          trust_points: supabase.raw("trust_points + 20"),
        })
        .eq("user_id", seller_id);

      await supabase
        .from("flipid_trust")
        .update({
          total_purchases: supabase.raw("total_purchases + 1"),
          trust_points: supabase.raw("trust_points + 15"),
        })
        .eq("user_id", buyer_id);
    }

    // Notifications
    await supabase.from("notifications").insert([
      {
        user_id: buyer_id,
        type: "order",
        actor_id: seller_id,
        item_id: data.item_id,
        message: `Order marked as ${status}`,
      },
      {
        user_id: seller_id,
        type: "order",
        actor_id: buyer_id,
        item_id: data.item_id,
        message: `Order marked as ${status}`,
      },
    ]);

    return res.status(200).json({ order: data });
  }

  // ---------------------- Not allowed ----------------------
  return res.status(405).json({ error: "Method not allowed" });
}
