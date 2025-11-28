export async function POST(req: Request) {
  const { disputeId, status, adminNotes } = await req.json();

  // await prisma.dispute.update({
  //   where: { id: disputeId },
  //   data: { status, adminNotes },
  // });

  return Response.json({ success: true });
}
