import { buffer } from "micro";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { NextApiRequest, NextApiResponse } from "next";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
  apiVersion: "2024-11-20.acacia" as any 
});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const config = { api: { bodyParser: false } };

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

  // 1. Logic for P2P Transaction Creation (Standard Checkout)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { orderId, buyerId } = session.metadata || {};

    // Get the original order to find the Seller ID
    const { data: order } = await supabase
      .from("market_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (order) {
      // Create the transaction record for P2P tracking
      await supabase.from("transactions").insert({
        order_id: orderId,
        buyer_id: buyerId,
        seller_id: order.user_id,
        amount: order.price,
        status: "pending_shipment",
        stripe_payment_intent_id: session.payment_intent as string,
      });

      // Mark the market listing as sold so it disappears from the book
      await supabase.from("market_orders").update({ status: "sold" }).eq("id", orderId);
    }
  }

  // 2. Your Existing Payment Intent Logic
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata?.orderId;
    
    await supabase
      .from("transactions")
      .update({ status: "escrow_locked", updated_at: new Date() })
      .eq("order_id", orderId);
  }

  // 3. Your Existing Seller Onboarding Logic
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
