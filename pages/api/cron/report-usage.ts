import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
  apiVersion: '2024-11-20.acacia' as any 
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 1. Fetch users who have an active subscription and pending usage
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, stripe_subscription_id, request_count')
      .gt('request_count', 0) // Only process users with usage > 0
      .not('stripe_subscription_id', 'is', null);

    if (error) throw error;

    for (const user of users) {
      try {
        // 2. Get Customer ID from the subscription
        const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id as string);
        const customerId = subscription.customer as string;

        // 3. Send the Meter Event to Stripe
        await stripe.billing.meterEvents.create({
          event_name: 'api_requests', 
          payload: {
            value: user.request_count.toString(), 
            stripe_customer_id: customerId,
          },
        });

        // 4. RESET local count so we don't double-bill next hour
        await supabase
          .from('profiles')
          .update({ request_count: 0 })
          .eq('id', user.id);

        console.log(`[METER_SENT] User ${user.id}: ${user.request_count} units`);
      } catch (subErr: any) {
        console.error(`[SKIP] Error for user ${user.id}:`, subErr.message);
      }
    }

    return res.status(200).json({ success: true, processed: users?.length || 0 });

  } catch (err: any) {
    console.error("Global Cron Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
} // <--- This closes the handler function