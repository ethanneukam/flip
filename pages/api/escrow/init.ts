import { StripeEscrow } from "@/lib/stripe-escrow";
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { orderId, userId } = req.body;

  try {
    // This runs on the SERVER where the Secret Key is safe and available
    const result = await StripeEscrow.initializeEscrow(orderId, userId);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}