import { supabase } from "@/lib/supabaseClient";

const CONFIDENCE_THRESHOLD = 40;

/**
 * Flip internal price history
 * Read-only, confidence-gated
 */
export async function readPriceHistory(itemUuid: string) {
  return supabase
    .from("item_prices")
    .select("price, created_at, confidence, source")
    .eq("item_uuid", itemUuid)
    .gte("confidence", CONFIDENCE_THRESHOLD)
    .order("created_at", { ascending: true });
}

/**
 * External market prices
 * Informational only
 */
export async function readExternalPrices(itemId: string) {
  if (!itemId) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("external_prices")
    .select("source, price, url, condition, last_checked")
    .eq("item_id", itemId)
    .order("last_checked", { ascending: false });

  return { data: data || [], error };
}
