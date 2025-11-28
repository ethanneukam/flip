// pages/api/stripe/webhook.ts
import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-08-15" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sig = req.headers["stripe-signature"] as string | undefined;
  if (!sig) return res.status(400).end("Missing signature");

  const buf = await buffer(req);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf.toString(), sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("Webhook signature error", err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const billId = invoice.metadata?.promotion_bill_id;
    if (billId) {
      await supabase.from("promotion_bills").update({ status: "paid", updated_at: new Date().toISOString() }).eq("id", billId);
    }
  } else if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const billId = invoice.metadata?.promotion_bill_id;
    if (billId) {
      await supabase.from("promotion_bills").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", billId);
    }
  }

  res.json({ received: true });
}
