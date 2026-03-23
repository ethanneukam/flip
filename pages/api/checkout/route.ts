import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe outside the handler to catch config errors early
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
apiVersion: '2024-11-20.acacia' as any
});

export async function POST(req: Request) {
  try {
    const { price_id, tier, user_id, user_email } = await req.json();

    // LOGGING: Check your Vercel/Render logs to see if these are empty
    console.log("Checking vars:", { 
        hasStripe: !!process.env.STRIPE_SECRET_KEY, 
        user: user_email 
    });

    // FORCE AN ABSOLUTE URL
    // If NEXT_PUBLIC_SITE_URL is missing, we use your actual domain
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://flip-black-two.vercel.app';

    const session = await stripe.checkout.sessions.create({
      customer_email: user_email,
      line_items: [{ price: price_id, quantity: 1 }],
      mode: 'subscription',
      // We ensure the URL starts with https://
      success_url: `${siteUrl}/vault?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing`,
      metadata: { user_id, tier },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('STRICT_CHECKOUT_ERROR:', err.message);
    return NextResponse.json(
      { error: `Backend Error: ${err.message}` }, 
      { status: 500 }
    );
  }
}