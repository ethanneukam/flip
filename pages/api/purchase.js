import { supabase } from "@/lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { buyerId, sellerId, itemId } = req.body;

  // TODO: Add Stripe or your payment system here

  // Award buyer
  await fetch(`${process.env.NEXT_PUBLIC_URL}/api/coins/award`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: buyerId,
      amount: 5,
      reason: "Purchased an item",
      related_id: itemId,
    }),
  });

  // Award seller
  await fetch(`${process.env.NEXT_PUBLIC_URL}/api/coins/award`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: sellerId,
      amount: 10,
      reason: "Sold an item",
      related_id: itemId,
    }),
  });

  return res.status(200).json({ success: true });
}
