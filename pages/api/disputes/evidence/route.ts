import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { disputeId, urls } = await req.json();

  // await prisma.dispute.update({
  //   where: { id: disputeId },
  //   data: { evidenceUrls: { push: urls } },
  // });

  return NextResponse.json({ success: true });
}
