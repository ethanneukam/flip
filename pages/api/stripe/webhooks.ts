// pages/api/stripe/webhooks.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Disable Next.js body parser (required for Stripe)
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

// Convert incoming request into a raw buffer
async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: any[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const buf = await getRawBody(req);
  const sig = req.headers["stripe-signature"];
let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { orderId, buyerId, sellerId } = session.metadata || {};

    // IMPORTANT: Grab the Payment Intent ID to capture funds later
    const paymentIntentId = session.payment_intent as string;

    // 1. Create/Update Transaction record
    const { error: txError } = await supabase.from("transactions").insert({
      order_id: orderId,
      buyer_id: buyerId,
      seller_id: sellerId,
      amount: session.amount_total! / 100,
      stripe_payment_intent_id: paymentIntentId,
      status: 'escrow_locked' 
    });

    if (txError) console.error("TX Error:", txError.message);

    // 2. Close Market Order
    await supabase.from("market_orders").update({ status: 'filled' }).eq("id", orderId);

    // 3. Mark Asset as Sold
    const { data: order } = await supabase.from("market_orders").select("ticker").eq("id", orderId).single();
    if (order) {
       await supabase.from("items").update({ status: "sold" }).eq("user_id", sellerId).eq("ticker", order.ticker).limit(1);
    }
  }

  res.json({ received: true });
}