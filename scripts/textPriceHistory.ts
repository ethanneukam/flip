import { supabase } from "../lib/supabaseClient";

async function seedTestData() {
  const itemId = "test-item-1"; // replace with a real item_id if you have one

  // Fake Flip-native sales (simulating completed sales)
  const nativeSales = [
    { source: "flip", price: 45.0 },
    { source: "flip", price: 49.5 },
    { source: "flip", price: 50.0 },
  ];

  for (const sale of nativeSales) {
    await supabase.from("price_history").insert({
      item_id: itemId,
      source: sale.source,
      price: sale.price,
      recorded_at: new Date(),
      extra_data: { type: "flip_sale" },
    });
  }

  // Fake external scraped prices
  const externalPrices = [
    { source: "amazon", price: 52.99, url: "https://amazon.com/item/123" },
    { source: "ebay", price: 47.0, url: "https://ebay.com/item/123" },
    { source: "walmart", price: 49.99, url: "https://walmart.com/item/123" },
  ];

  for (const ext of externalPrices) {
    await supabase.from("external_prices").insert({
      item_id: itemId,
      source: ext.source,
      price: ext.price,
      url: ext.url,
      title: "Test Item",
    });
  }

  console.log("✅ Test data inserted successfully!");
}

seedTestData();