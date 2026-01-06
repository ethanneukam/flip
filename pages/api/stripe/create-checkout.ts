import Stripe from 'stripe';
import { NextApiRequest, NextApiResponse } from 'next';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
 apiVersion: '2024-11-20.acacia' as any,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { orderId, price, ticker, buyerId } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${ticker.toUpperCase()} Asset`,
              description: `Order ID: ${orderId}`,
            },
            unit_amount: Math.round(price * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Metadata is KEY: This is how our webhook knows what to update in the DB later
      metadata: {
        orderId: orderId,
        buyerId: buyerId,
        type: 'market_purchase'
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/profile?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/market/${ticker}`,
    });

    res.status(200).json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
