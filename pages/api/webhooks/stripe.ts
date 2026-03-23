import { buffer } from "micro";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { NextApiRequest, NextApiResponse } from "next";
import { generateApiKey } from "@/lib/keys";

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

  // 1. Handle Successful Checkouts (Both P2P and Subscriptions)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // --- API DEVELOPER SUBSCRIPTIONS ---
    if (session.mode === "subscription") {
      const userId = session.client_reference_id;
      const subscriptionId = session.subscription as string;
      const tier = session.metadata?.tier || 'Starter';

      // 1. Upgrade the user's profile
      await supabase
        .from("profiles")
        .update({ 
          tier, 
          stripe_subscription_id: subscriptionId, 
          request_count: 0 
        })
        .eq("id", userId);

      // 2. Mint the API Key using your lib/keys
      const mintedKey = generateApiKey();
      
      await supabase
        .from("api_keys")
        .upsert({
          user_id: userId,
          key_value: mintedKey,
          label: `${tier} Production Key`
        }, { onConflict: 'user_id' });

      console.log(`SUCCESS: Issued ${mintedKey} to User ${userId}`);
    } 
    
    // --- P2P MARKETPLACE TRANSACTIONS ---
    else if (session.mode === "payment") {
      const { orderId, buyerId } = session.metadata || {};

      const { data: order } = await supabase
        .from("market_orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (order) {
        await supabase.from("transactions").insert({
          order_id: orderId,
          buyer_id: buyerId,
          seller_id: order.user_id,
          amount: order.price,
          status: "pending_shipment",
          stripe_payment_intent_id: session.payment_intent as string,
        });

        await supabase.from("market_orders").update({ status: "sold" }).eq("id", orderId);
      }
    }
  }

  // --- HANDLE CANCELED SUBSCRIPTIONS ---
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    
    await supabase
      .from("profiles")
      .update({ tier: "free", stripe_subscription_id: null })
      .eq("stripe_subscription_id", subscription.id);
  }

// --- INVOICE RENEWAL ---
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as any; // Cast to any to bypass strict sub-field checks
    
    // 1. Extract the ID safely from the 'any' object
    const rawSub = invoice.subscription;
    const subId = typeof rawSub === 'string' ? rawSub : rawSub?.id;

    // 2. Only proceed if we actually have a valid string
    if (subId && typeof subId === 'string') {
      await supabase
        .from("profiles")
        .update({ request_count: 0 })
        .eq("stripe_subscription_id", subId);
        
      console.log(`[RENEWAL] Usage reset for sub: ${subId}`);
    }
  }

  // --- MERCHANT ONBOARDING ---
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