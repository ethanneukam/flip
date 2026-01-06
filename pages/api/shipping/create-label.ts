import { NextApiRequest, NextApiResponse } from 'next';
const shippo = require('shippo')(process.env.SHIPPO_API_KEY);
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { transactionId } = req.body;

  try {
    // Fetch transaction and BOTH profiles (Buyer and Seller)
    const { data: tx, error } = await supabase
      .from('transactions')
      .select(`
        *,
        buyer:profiles!buyer_id(*),
        seller:profiles!seller_id(*)
      `)
      .eq('id', transactionId)
      .single();

    if (!tx || error) throw new Error("Transaction not found");

    // Create Shipment with P2P Address Mapping
    const shipment = await shippo.shipment.create({
      address_from: {
        name: tx.seller.full_name,
        street1: tx.seller.address_line1,
        city: tx.seller.city,
        state: tx.seller.state,
        zip: tx.seller.zip,
        country: 'US',
      },
      address_to: {
        name: tx.buyer.full_name,
        street1: tx.buyer.address_line1,
        city: tx.buyer.city,
        state: tx.buyer.zip,
        zip: tx.buyer.zip,
        country: 'US',
      },
      parcels: [{ length: "6", width: "4", height: "1", distance_unit: "in", weight: "4", mass_unit: "oz" }],
      async: false,
    });

    const rate = shipment.rates[0];
    const label = await shippo.transaction.create({ rate: rate.object_id, label_file_type: "PDF", async: false });

    // Update DB with tracking so Buyer can see it
    await supabase.from('transactions').update({
      status: 'shipped',
      tracking_number: label.tracking_number,
      label_url: label.label_url
    }).eq('id', transactionId);

    res.status(200).json({ url: label.label_url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
