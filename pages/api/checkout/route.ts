import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
apiVersion: '2024-11-20.acacia' as any
});

export async function POST(req: Request) {
  try {
    const { price_id, tier, user_id, user_email } = await req.json();

    // 1. GET THE FULL URL FROM THE REQUEST HEADERS
    const host = req.headers.get('host'); // e.g. flip-black-two.vercel.app
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    console.log("Constructed Base URL:", baseUrl);

    // 2. CREATE THE SESSION
    const session = await stripe.checkout.sessions.create({
      customer_email: user_email,
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      // We manually build these to ENSURE they have https://
      success_url: `${baseUrl}/vault?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: {
        user_id: user_id,
        tier: tier,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    // This logs the exact error to your Vercel dashboard
    console.error('Checkout error:', err);
    return NextResponse.json(
      { error: err.message }, 
      { status: 500 }
    );
  }
}