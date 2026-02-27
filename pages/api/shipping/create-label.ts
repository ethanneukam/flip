import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
// @ts-ignore
import Shippo from 'shippo';

// Initialize the client once
const shippo = new (Shippo as any)(process.env.SHIPPO_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { transactionId } = req.body;
  if (!transactionId) return res.status(400).json({ error: 'Missing transactionId' });

  try {
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select(`
        *,
        buyer:profiles!buyer_id(*),
        seller:profiles!seller_id(*)
      `)
      .eq('id', transactionId)
      .single();

    if (txError || !tx) throw new Error("Transaction record not found.");
    
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
        state: tx.buyer.state,
        zip: tx.buyer.zip,
        country: 'US',
      },
      parcels: [{ length: "10", width: "7", height: "3", distance_unit: "in", weight: "12", mass_unit: "oz" }],
      async: false,
    });

    // Find cheapest rate
    const rate = shipment.rates.sort((a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount))[0];
    if (!rate) throw new Error("No rates found.");

    const label = await shippo.transaction.create({ 
      rate: rate.object_id, 
      label_file_type: "PDF", 
      async: false 
    });

    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'shipped',
        tracking_number: label.tracking_number,
        label_url: label.label_url,
        shipping_cost: rate.amount,
        carrier: rate.provider,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);

    if (updateError) throw updateError;

    res.status(200).json({ url: label.label_url, tracking: label.tracking_number });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}