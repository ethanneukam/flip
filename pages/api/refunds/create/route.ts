import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { disputeId, chargeId, amount } = await req.json();

  try {
    const refund = await stripe.refunds.create({
      charge: chargeId,
      amount,
    });

    // await prisma.refundRequest.create({
    //   data: {
    //     disputeId,
    //     stripeChargeId: chargeId,
    //     amount,
    //     status: "success",
    //   },
    // });

    return NextResponse.json({ success: true, refund });
  } catch (e) {
    return NextResponse.json({ success: false, error: e });
  }
}
