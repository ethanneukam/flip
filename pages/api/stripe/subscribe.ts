import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
  apiVersion: '2024-11-20.acacia' as any 
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, tier } = req.body;
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // 1. Map Tier names to Stripe Price IDs
  const prices: { [key: string]: string } = {
    base: process.env.STRIPE_PRICE_BASE!,
    pro: process.env.STRIPE_PRICE_PRO!,
    business: process.env.STRIPE_PRICE_BUSINESS!
  };

  const priceId = prices[tier];
  if (!priceId) return res.status(400).json({ error: "Invalid tier selected" });

  try {
    // 2. Get User Email
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', userId).single();
    if (!profile?.email) return res.status(400).json({ error: "User email not found" });

    // 3. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: profile.email,
      success_url: `${SITE_URL}/vault?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/pricing`,
      metadata: {
        supabase_id: userId,
        tier: tier
      }
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe Subscription Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}