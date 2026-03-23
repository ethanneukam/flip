import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any
});

export async function POST(req: Request) {
  try {
    const { price_id, tier, user_id, user_email } = await req.json();

    // Fix: use x-forwarded-* headers that Vercel actually populates,
    // then fall back to NEXT_PUBLIC_APP_URL, then fall back to host.
    const forwardedHost = req.headers.get('x-forwarded-host');
    const forwardedProto = req.headers.get('x-forwarded-proto') ?? 'https';
    const fallbackUrl = process.env.NEXT_PUBLIC_APP_URL;

    let baseUrl: string;

    if (fallbackUrl) {
      baseUrl = fallbackUrl; // most reliable — set this in Vercel env vars
    } else if (forwardedHost) {
      baseUrl = `${forwardedProto}://${forwardedHost}`;
    } else {
      const host = req.headers.get('host');
      const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
      baseUrl = `${protocol}://${host}`;
    }

    // Guard: if baseUrl is still broken, throw early with a clear message
    if (!baseUrl || baseUrl.includes('null') || baseUrl.includes('undefined')) {
      throw new Error(`Could not determine baseUrl. Got: "${baseUrl}"`);
    }

    console.log("Constructed Base URL:", baseUrl);

    const session = await stripe.checkout.sessions.create({
      customer_email: user_email,
      line_items: [{ price: price_id, quantity: 1 }],
      mode: 'subscription',
      success_url: `${baseUrl}/vault?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: { user_id, tier },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}