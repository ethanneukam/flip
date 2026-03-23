import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
 apiVersion: '2024-11-20.acacia' as any // Or your preferred version
});

export async function POST(req: Request) {
  try {
    const { price_id, tier, user_id, user_email } = await req.json();

    // GET THE BASE URL DYNAMICALLY
    // This prevents the "Invalid URL" error on Vercel/Render
    const origin = req.headers.get('origin') || 'https://flip-black-two.vercel.app';

    const session = await stripe.checkout.sessions.create({
      customer_email: user_email,
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      // FIX: These must be absolute URLs (https://...)
      success_url: `${origin}/vault?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        user_id: user_id,
        tier: tier,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('STRIPE_ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}