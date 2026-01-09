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
  
  const { userId } = req.body;
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    let stripeId = profile.stripe_connect_id;

    // 1. Create Connect Account if it doesn't exist
    if (!stripeId) {
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { supabase_id: userId }
      });
      
      stripeId = account.id;
      await supabase.from('profiles').update({ stripe_connect_id: stripeId }).eq('id', userId);
    }

    // 2. Create the Onboarding Link
    // Note: We use /vault as the return URL since we are merging Profile into Vault
    const link = await stripe.accountLinks.create({
      account: stripeId,
      refresh_url: `${SITE_URL}/vault`,
      return_url: `${SITE_URL}/vault`,
      type: 'account_onboarding',
    });

    res.status(200).json({ url: link.url });
  } catch (err: any) {
    console.error("Stripe Onboarding Error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
