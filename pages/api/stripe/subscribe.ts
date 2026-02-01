import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover', // Use 'latest' or your preferred version
});

// Initialize Supabase Admin (to verify user exists)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // MUST use Service Role Key here
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Handle CORS (Critical for Mobile App)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); // In production, replace '*' with your specific domains
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle "OPTIONS" preflight check
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, tier, email } = req.body;

    // 2. Map Tiers to YOUR Stripe Price IDs
    // GO TO STRIPE DASHBOARD -> PRODUCTS -> COPY PRICE IDs (start with price_...)
    const PRICE_IDS = {
      base: 'price_1SrVvwBg1skeYcWAVJ3KfWxE',      // $25
      pro: 'price_1SrVyKBg1skeYcWA2nkWeSJt',        // $50
      business: 'price_1SrVzkBg1skeYcWAY386ses0',   // $250
    };

    const selectedPriceId = PRICE_IDS[tier as keyof typeof PRICE_IDS];

    if (!selectedPriceId) {
      throw new Error("Invalid Tier Selected");
    }

    // 3. Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/pricing`,
      customer_email: email,
      metadata: {
        userId: userId,
        tier: tier,
      },
    });

    res.status(200).json({ url: session.url });

  } catch (error: any) {
    console.error('Stripe Error:', error);
    res.status(500).json({ error: error.message });
  }
}
