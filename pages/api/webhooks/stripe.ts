import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export const config = {
  api: {
    bodyParser: false,
  },
};

const buffer = async (req: NextApiRequest) => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // -------------------------------
  // CHECKOUT SESSION COMPLETE
  // -------------------------------
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const { error } = await supabase.from("transactions").insert([
      {
        stripe_session_id: session.id,
        amount: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_details?.email,
        status: session.payment_status,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) console.error("❌ Supabase insert error:", error);
    else console.log("✅ Transaction stored in Supabase:", session.id);
  }

  // -------------------------------
  // IDENTITY VERIFICATION COMPLETE
  // -------------------------------
  if (event.type === "identity.verification_session.verified") {
    const typed = event as any;

    const session = typed.data.object as Stripe.Identity.VerificationSession;
    const userId = session.metadata?.user_id;

    if (userId) {
      const { error } = await supabase
        .from("profiles")
        .update({ verified: true })
        .eq("id", userId);

      if (error) console.error("Supabase update error:", error);
      else console.log(`✅ User ${userId} verified`);
    }
  }

  return res.json({ received: true });
}
