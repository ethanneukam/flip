import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const data = await req.json();

  // await prisma.shippingAddress.create({ data });

  return NextResponse.json({ success: true });
}
