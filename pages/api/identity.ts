import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const { user_id } = req.body;

  try {
    // Create a Stripe Identity Verification Session
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: { user_id },
      options: { document: { require_id_number: true } },
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`, // after completion
    });

    res.json({ url: verificationSession.url });
  } catch (err: any) {
    console.error("Stripe Identity error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
