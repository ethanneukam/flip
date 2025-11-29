import { supabase } from "@/lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { user_id, amount, reason, related_id } = req.body;

  if (!user_id || !amount)
    return res.status(400).json({ error: "Missing params" });

  // Insert coin transaction
  await supabase.from("flip_coins").insert([
    {
      user_id,
      amount,
      reason,
      related_id,
    },
  ]);

  // Update profile balance
  await supabase.rpc("increment_coins_balance", {
    user_id_input: user_id,
    amount_input: amount,
  });

  return res.status(200).json({ success: true });
}
