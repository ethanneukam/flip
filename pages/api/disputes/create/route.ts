import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma"; // uncomment Sunday

export async function POST(req: Request) {
  const { listingId, orderId, buyerId, sellerId, reason, details, evidenceUrls } =
    await req.json();

  // const dispute = await prisma.dispute.create({
  //   data: { listingId, orderId, buyerId, sellerId, reason, details, evidenceUrls },
  // });

  return NextResponse.json({
    success: true,
    // dispute
  });
}
