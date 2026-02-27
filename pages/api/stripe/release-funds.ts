import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-11-20.acacia' as any });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { transactionId } = req.body;

  try {
    const { data: tx } = await supabase
      .from('transactions')
      .select('*, profiles!seller_id(stripe_connect_id)')
      .eq('id', transactionId)
      .single();

    if (!tx || tx.status !== 'delivered') throw new Error("Transaction not eligible for release.");

    // CAPTURE the money (Moves from 'held' to 'paid')
    await stripe.paymentIntents.capture(tx.stripe_payment_intent_id);

    // Update DB
    await supabase.from('transactions').update({ 
      status: 'completed', 
      escrow_released_at: new Date().toISOString() 
    }).eq('id', transactionId);

    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}