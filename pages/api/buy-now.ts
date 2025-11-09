// pages/api/buy-now.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  try {
    const { item_id, buyer_email } = req.body;

    const { data: item, error: itemError } = await supabase
      .from("items")
      .select("title, price, user_id")
      .eq("id", item_id)
      .single();

    if (itemError || !item) return res.status(400).json({ error: "Item not found" });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", item.user_id)
      .single();

    if (profileError || !profile) return res.status(400).json({ error: "Seller not found" });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: buyer_email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: item.title },
            unit_amount: item.price * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: Math.round(item.price * 0.05 * 100), // 5% fee
        transfer_data: { destination: profile.stripe_account_id },
      },
      metadata: { item_id },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
    });

    res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}