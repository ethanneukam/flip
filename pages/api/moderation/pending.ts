import { prisma } from "../../../lib/prisma";

export default async function handler(req, res) {
  const listings = await prisma.listing.findMany({
    where: { moderationStatus: "pending" },
  });

  res.json({ listings });
}
