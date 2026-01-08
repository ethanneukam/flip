import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
const shippo = require('shippo')(process.env.SHIPPO_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transactionId } = req.body;

  if (!transactionId) {
    return res.status(400).json({ error: 'Missing transactionId' });
  }

  try {
    // 1. Fetch transaction and profiles
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select(`
        *,
        buyer:profiles!buyer_id(*),
        seller:profiles!seller_id(*)
      `)
      .eq('id', transactionId)
      .single();

    if (txError || !tx) throw new Error("Transaction record not found in Supabase.");
    if (!tx.seller || !tx.buyer) throw new Error("Buyer or Seller profile details are incomplete.");

    // 2. Create Shipment
    // Using default parcel size for standard flip items (e.g., electronics/apparel)
    const shipment = await shippo.shipment.create({
      address_from: {
        name: tx.seller.full_name,
        street1: tx.seller.address_line1,
        city: tx.seller.city,
        state: tx.seller.state,
        zip: tx.seller.zip,
        country: 'US',
        validate: true, // Asks Shippo to verify the address
      },
      address_to: {
        name: tx.buyer.full_name,
        street1: tx.buyer.address_line1,
        city: tx.buyer.city,
        state: tx.buyer.state, // Fixed: previously was mapped to tx.buyer.zip
        zip: tx.buyer.zip,
        country: 'US',
        validate: true,
      },
      parcels: [{ 
        length: "10", 
        width: "7", 
        height: "3", 
        distance_unit: "in", 
        weight: "12", 
        mass_unit: "oz" 
      }],
      async: false,
    });

    // 3. Select the Cheapest Rate
    // Filter for the best rate or just take the first one (usually USPS Ground Advantage)
    const rate = shipment.rates.sort((a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount))[0];

    if (!rate) {
      throw new Error("No shipping rates available for this route.");
    }

    // 4. Purchase the Label
    const transaction = await shippo.transaction.create({ 
      rate: rate.object_id, 
      label_file_type: "PDF", 
      async: false 
    });

    if (transaction.status !== "SUCCESS") {
      throw new Error(`Shippo Error: ${transaction.messages[0]?.text || "Label purchase failed"}`);
    }

    // 5. Sync to Supabase
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'shipped',
        tracking_number: transaction.tracking_number,
        label_url: transaction.label_url,
        shipping_cost: rate.amount,
        carrier: rate.provider,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);

    if (updateError) throw updateError;

    // 6. Return the Label URL to the Frontend
    res.status(200).json({ 
      url: transaction.label_url, 
      tracking: transaction.tracking_number 
    });

  } catch (error: any) {
    console.error("📦 Shipping Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}
