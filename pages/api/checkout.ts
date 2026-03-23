import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
});

// Single helper — no more scattered URL logic
function getBaseUrl(req: NextApiRequest): string {
  // 1. Explicit env var is the most reliable (set this in Vercel)
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;

  // 2. Vercel forwards these headers on all serverless invocations
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers["host"];

  if (!host) throw new Error("Cannot determine base URL: no host header found");

  const base = `${proto}://${host}`;

  // Catch leftover "null" / "undefined" strings before they reach Stripe
  if (base.includes("null") || base.includes("undefined")) {
    throw new Error(`Resolved base URL looks broken: "${base}"`);
  }

  return base;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  try {
    const baseUrl = getBaseUrl(req); // derived once, used everywhere
    console.log("[checkout] baseUrl:", baseUrl);

    const { purchase_type } = req.body;

    // ── BRANCH 1: API DEVELOPER SUBSCRIPTION ──────────────────────────
    if (purchase_type === "subscription") {
      const { price_id, user_id, user_email, tier } = req.body;

      if (!price_id || !user_id) {
        return res.status(400).json({ error: "Missing price_id or user_id" });
      }

      const session = await stripe.checkout.sessions.create({
        customer_email: user_email,
        payment_method_types: ["card"],
        line_items: [{ price: price_id, quantity: 1 }],
        mode: "subscription",
        success_url: `${baseUrl}/dashboard?success=true`,
        cancel_url: `${baseUrl}/pricing?canceled=true`,
        client_reference_id: user_id,
        metadata: { tier, userId: user_id },
      });

      return res.status(200).json({ url: session.url });
    }

    // ── BRANCH 2: P2P MARKETPLACE PURCHASE ────────────────────────────
    else {
      const { item_id, buyer_email } = req.body;

      if (!item_id || !buyer_email) {
        return res.status(400).json({ error: "Missing required fields for marketplace" });
      }

      const { data: item, error: itemError } = await supabase
        .from("items")
        .select("id, title, price, user_id")
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
        customer_email: buyer_email,
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: item.title },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        metadata: { orderId: item.id, buyerId: buyer_email },
        success_url: `${baseUrl}/marketplace?success=true`,
        cancel_url: `${baseUrl}/marketplace?canceled=true`,
      });

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
    }
  } catch (err: any) {
    console.error("Checkout error:", err);
    return res.status(500).json({ error: err.message });
  }
}