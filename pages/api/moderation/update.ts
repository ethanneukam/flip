import { prisma } from "../../../lib/prisma";

export default async function handler(req, res) {
  const { id, status } = req.body;

  await prisma.listing.update({
    where: { id },
    data: { moderationStatus: status },
  });

  res.json({ ok: true });
}
