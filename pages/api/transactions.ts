import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 🔹 Handle POST requests (purchase + release)
    if (req.method === "POST") {
      const { buyerId, sellerId, itemId, price, action, transactionId } = req.body;

      if (action === "purchase") {
        await handlePurchase(buyerId, sellerId, itemId, price);
        return res.status(200).json({ success: true, message: "Funds held in escrow" });
      }

      if (action === "release") {
        await releaseFunds(transactionId);
        return res.status(200).json({ success: true, message: "Funds released to seller" });
      }

      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    // 🔹 Handle GET requests (fetch all transactions)
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("flip_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json(data);
    }

    // 🔹 Invalid method
    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (err: any) {
    console.error("Transaction API error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// 💰 Escrow purchase (hold funds)
async function handlePurchase(buyerId: string, sellerId: string, itemId: string, price: number) {
  const { data: buyerWallet } = await supabase
    .from("flip_wallets")
    .select("*")
    .eq("user_id", buyerId)
    .single();

  if (!buyerWallet || buyerWallet.balance < price)
    throw new Error("Insufficient funds");

  // Deduct from buyer
  await supabase
    .from("flip_wallets")
    .update({ balance: buyerWallet.balance - price })
    .eq("user_id", buyerId);

  // Create transaction record (held in escrow)
  await supabase.from("flip_transactions").insert([
    {
      from_user: buyerId,
      to_user: sellerId,
      item_id: itemId,
      amount: price,
      status: "held",
      type: "purchase",
      note: "Payment held in escrow until completion",
    },
  ]);
}

// 💸 Release funds to seller
async function releaseFunds(transactionId: string) {
  const { data: tx } = await supabase
    .from("flip_transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (!tx || tx.status !== "held")
    throw new Error("Invalid or already released transaction");

  // Credit seller wallet
  await supabase.rpc("increment_wallet_balance", {
    user_id: tx.to_user,
    amount: tx.amount,
  });

  // Mark transaction as released
  await supabase
    .from("flip_transactions")
    .update({ status: "released" })
    .eq("id", transactionId);
}