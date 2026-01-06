import { buffer } from "micro";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { NextApiRequest, NextApiResponse } from "next";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-01-06" as any });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const config = { api: { bodyParser: false } }; // Critical: Stripe needs the raw body

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"]!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the "Real Money" Logic
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { orderId } = paymentIntent.metadata;

    console.log(`💰 Payment Succeeded for Order: ${orderId}`);

    // Update Transaction status to 'escrow_locked'
    const { error } = await supabase
      .from("transactions")
      .update({ status: "escrow_locked", updated_at: new Date() })
      .eq("order_id", orderId);

    if (error) console.error("DB Update Error:", error);

    // Trigger Notification for Seller (Logic here...)
  }

  // Handle Seller Onboarding Completion
  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    if (account.details_submitted && account.payouts_enabled) {
      await supabase
        .from("profiles")
        .update({ is_merchant_verified: true })
        .eq("stripe_connect_id", account.id);
    }
  }

  res.json({ received: true });
}
