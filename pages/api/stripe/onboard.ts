import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-06' as any,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { userId } = req.body;

  try {
    // 1. Check if user already has a Stripe ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_connect_id')
      .eq('id', userId)
      .single();

    let stripeId = profile?.stripe_connect_id;

    // 2. If not, create a new Express Connect account
    if (!stripeId) {
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      stripeId = account.id;
      
      // Save it to Supabase immediately
      await supabase.from('profiles').update({ stripe_connect_id: stripeId }).eq('id', userId);
    }

    // 3. Create the "Account Link" (The temporary URL for onboarding)
    const accountLink = await stripe.accountLinks.create({
      account: stripeId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/profile`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/profile`,
      type: 'account_onboarding',
    });

    res.status(200).json({ url: accountLink.url });
  } catch (error: any) {
    console.error('Stripe Onboarding Error:', error);
    res.status(500).json({ error: error.message });
  }
}
