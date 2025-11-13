// pages/api/buy.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";
import Stripe from "stripe";

// Use default API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { item_id, buyer_id } = req.body;

    if (!item_id || !buyer_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Fetch item from Supabase
    const { data: item, error: itemError } = await supabase
      .from("items")
      .select("*")
      .eq("id", item_id)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // 2. Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(item.price * 100), // price in cents
      currency: "usd",
      metadata: {
        item_id: item.id,
        seller_id: item.user_id,
        buyer_id,
      },
    });

    // 3. Insert into transactions table
    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .insert([
        {
          item_id: item.id,
          seller_id: item.user_id,
          buyer_id,
          amount: item.price,
          stripe_payment_intent_id: paymentIntent.id,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (txError) {
      return res.status(500).json({ error: txError.message });
    }

    // 4. Send client secret back to frontend
    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      transaction: tx,
    });
  } catch (err: any) {
    console.error("Buy Now error:", err);
    return res.status(500).json({ error: err.message });
  }
}