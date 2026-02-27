import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Shippo sends POST webhooks
  const { data } = req.body; 

  // We only care if the status is "DELIVERED"
  if (data.status === "DELIVERED") {
    const trackingNumber = data.tracking_number;

    // 1. Find the transaction tied to this tracking number
    const { data: tx, error } = await supabase
      .from('transactions')
      .select('id, stripe_payment_intent_id')
      .eq('tracking_number', trackingNumber)
      .single();

    if (tx) {
      // 2. Update status to 'delivered'
      await supabase.from('transactions').update({ status: 'delivered' }).eq('id', tx.id);
      
      // 3. Trigger the actual payout (We'll build this next)
      // For now, we hit our own internal release API or call the function directly
      console.log(`📦 Item ${trackingNumber} delivered. Ready for payout.`);
    }
  }

  res.status(200).json({ received: true });
}