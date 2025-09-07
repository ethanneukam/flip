// pages/api/analyze.ts

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).end("Method not allowed");
  }

  const { sneaker, price } = req.body;

  // Mock AI response
  const mockResult = `Sneaker "${sneaker}" priced at $${price || "N/A"} looks promising for flipping. Recent demand is high and potential profit margin is around 25%.`;

  // Simulate slight delay like a real API call
  await new Promise((r) => setTimeout(r, 800));

  res.status(200).json({ result: mockResult });
}
