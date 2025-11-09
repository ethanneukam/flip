// pages/api/markSold.ts
import { supabase } from "../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { item_id, buyer_id, price } = req.body;

    // 1️⃣ Get seller info
    const { data: itemData, error: itemError } = await supabase
      .from("items")
      .select("user_id")
      .eq("id", item_id)
      .single();

    if (itemError) throw itemError;
    const seller_id = itemData.user_id;

    // 2️⃣ Insert into sales table
    const { error: saleError } = await supabase.from("sales").insert([
      {
        item_id,
        seller_id,
        buyer_id,
        price,
      },
    ]);

    if (saleError) throw saleError;

    // 3️⃣ Add to price_history
    const { error: priceError } = await supabase.from("price_history").insert([
      {
        item_id,
        source: "flip",
        price,
      },
    ]);

    if (priceError) throw priceError;

    // 4️⃣ Mark item as sold
    const { error: updateError } = await supabase
      .from("items")
      .update({ status: "sold" })
      .eq("id", item_id);

    if (updateError) throw updateError;

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Sale Error:", error);
    res.status(500).json({ error: error.message });
  }
}