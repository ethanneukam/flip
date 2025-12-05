// pages/api/stripe-webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";

export const config = {
  api: {
    bodyParser: false, // Stripe requires raw body
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
 apiVersion: "2025-10-29.clover",
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  const sig = req.headers["stripe-signature"] as string;
  const buf = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const itemId = session.metadata?.item_id;
      const buyerEmail = session.customer_email;

      if (itemId && buyerEmail) {
        const { data: item } = await supabase
          .from("items")
          .select("title, price, user_id")
          .eq("id", itemId)
          .single();

        if (item) {
          // ✅ Record transaction
          await supabase.from("transactions").insert([
            {
              item_id: itemId,
              item_name: item.title,
              buyer_email: buyerEmail,
              seller_id: item.user_id,
              amount: item.price,
              status: "completed",
            },
          ]);

          // ✅ Mark as sold
          await supabase.from("items").update({ status: "sold" }).eq("id", itemId);
        }
      }
    } catch (err) {
      console.error("Error saving transaction:", err);
    }
  }

  res.json({ received: true });
}
