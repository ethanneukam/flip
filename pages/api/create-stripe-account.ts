import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  try {
    const { user_id, email } = req.body;
    if (!user_id || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1️⃣ Create or fetch connected account
    const account = await stripe.accounts.create({
      type: "express",
      email,
    });

    // 2️⃣ Store Stripe account ID in Supabase
    const { error } = await supabase
      .from("profiles")
      .update({ stripe_account_id: account.id })
      .eq("id", user_id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // 3️⃣ Generate onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/onboarding/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/onboarding/success`,
      type: "account_onboarding",
    });

    return res.status(200).json({ url: accountLink.url });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}