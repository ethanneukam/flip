import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-11-20.acacia' as any });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.body;

  try {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

    let stripeId = profile?.stripe_connect_id;

    if (!stripeId) {
      const account = await stripe.accounts.create({ type: 'express' });
      stripeId = account.id;
      await supabase.from('profiles').update({ stripe_connect_id: stripeId }).eq('id', userId);
    }

    const link = await stripe.accountLinks.create({
      account: stripeId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/profile`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/profile`,
      type: 'account_onboarding',
    });

    res.status(200).json({ url: link.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
