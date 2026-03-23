// pages/api/checkout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";

// I aligned the Stripe version with your webhook version so they match perfectly
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any, 
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  try {
    // We check what type of purchase this is from the frontend
    const { purchase_type } = req.body;

    // =========================================================
    // BRANCH 1: API DEVELOPER SUBSCRIPTION (The New Stuff)
    // =========================================================
    if (purchase_type === "subscription") {
      const { price_id, user_id, user_email, tier } = req.body;

      if (!price_id || !user_id) {
        return res.status(400).json({ error: "Missing price_id or user_id" });
      }

      const session = await stripe.checkout.sessions.create({
        customer_email: user_email, 
        payment_method_types: ['card'],
        line_items: [
          {
            price: price_id, // The frontend passes the specific Stripe Price ID here
          },
        ],
        mode: 'subscription', // Crucial for recurring billing
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?canceled=true`,
        client_reference_id: user_id, // Let's the webhook know who paid
        metadata: {
          tier: tier, // Passes the tier name (e.g., "Starter") to the webhook
          userId: user_id
        }
      });

      return res.status(200).json({ url: session.url });
    }

    // =========================================================
    // BRANCH 2: P2P MARKETPLACE PURCHASE (Your Existing Code)
    // =========================================================
    else {
      const { item_id, buyer_email } = req.body;

      if (!item_id || !buyer_email) {
        return res.status(400).json({ error: "Missing required fields for marketplace" });
      }

      // 1. Fetch item
      const { data: item, error: itemError } = await supabase
        .from("items")
        .select("id, title, price, user_id")
        .eq("id", item_id)
        .single();

      if (itemError || !item) return res.status(400).json({ error: "Item not found" });

      // 2. Fetch seller Stripe account
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", item.user_id)
        .single();

      if (profileError || !profile) return res.status(400).json({ error: "Seller not found" });

      // 3. Create Stripe Session for P2P
      const session = await stripe.checkout.sessions.create({
        customer_email: buyer_email,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: { name: item.title },
              unit_amount: Math.round(item.price * 100), // Stripe expects cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        // Assuming you handle escrow/transfers via PaymentIntents in your webhook
        metadata: {
          orderId: item.id,
          buyerId: buyer_email // Or pass the actual UUID if you have it
        },
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/marketplace?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/marketplace?canceled=true`,
      });

      // 4. Insert pending transaction in DB
      await supabase.from("transactions").insert([
        {
          item_id: item.id,
          buyer_email: buyer_email,
          seller_id: item.user_id,
          amount: item.price,
          status: "pending",
          stripe_session_id: session.id,
        },
      ]);

      return res.status(200).json({ url: session.url });
    }

  } catch (err: any) {
    console.error("Checkout error:", err);
    return res.status(500).json({ error: err.message });
  }
}