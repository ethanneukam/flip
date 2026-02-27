import Stripe from 'stripe';
import { NextApiRequest, NextApiResponse } from 'next';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { orderId, price, ticker, buyerId, sellerStripeConnectId, sellerId } = req.body;

  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

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
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      payment_intent_data: {
        transfer_data: {
          destination: sellerStripeConnectId, 
        },
        capture_method: 'manual', // Funds held in Escrow
      },
      metadata: {
        orderId: orderId,
        buyerId: buyerId,
        sellerId: sellerId,
        type: 'market_purchase'
      },
      success_url: `${siteUrl}/vault?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/charts?ticker=${ticker}`,
    });

    res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Session Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}