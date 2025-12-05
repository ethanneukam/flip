// pages/api/checkout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
 apiVersion: "2025-10-29.clover", // ✅ stable version instead of "basil"
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  try {
    const { item_id, buyer_email } = req.body;

    if (!item_id || !buyer_email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1️⃣ Fetch item
    const { data: item, error: itemError } = await supabase
      .from("items")
      .select("id, title, price, user_id")
      .eq("id", item_id)
      .single();

    if (itemError || !item) return res.status(400).json({ error: "Item not found" });

    // 2️⃣ Fetch seller Stripe account
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", item.user_id)
      .single();

    if (profileError || !profile) return res.status(400).json({ error: "Seller not found" });

    // 3️⃣ Create checkout session with transfer to seller
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: buyer_email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: item.title },
            unit_amount: Math.round(item.price * 100), // Stripe requires cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: Math.round(item.price * 0.05 * 100), // 5% fee
        transfer_data: { destination: profile.stripe_account_id },
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
      metadata: {
        item_id: item.id,
        seller_id: item.user_id,
        buyer_email,
      },
    });

    // 4️⃣ Insert pending transaction in DB
    await supabase.from("transactions").insert([
      {
        item_id: item.id,
        buyer_email,
        seller_id: item.user_id,
        amount: item.price,
        status: "pending",
        stripe_session_id: session.id,
      },
    ]);

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return res.status(500).json({ error: err.message });
  }
}
