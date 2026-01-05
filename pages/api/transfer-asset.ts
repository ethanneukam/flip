import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: any, res: any) {
  const { assetId, buyerId, price } = req.body;

  // 1. Start a "Transaction" in Supabase
  // In a real app, you'd use a RPC or Transaction to ensure both happen or neither
  
  // A. Update the owner of the asset
  const { error: updateError } = await supabase
    .from('user_assets')
    .update({ 
      user_id: buyerId, 
      is_for_sale: false,
      acquisition_price: price 
    })
    .eq('id', assetId);

  if (updateError) return res.status(500).json({ error: "Transfer failed" });

  // B. Record the sale in a history table for the charts
  await supabase.from('sales_history').insert({
    asset_id: assetId,
    price: price,
    buyer_id: buyerId,
    timestamp: new Date()
  });

  return res.status(200).json({ success: true });
}
