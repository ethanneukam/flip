import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CONFIDENCE_THRESHOLD = 40;

export async function readPriceHistory(itemUuid: string) {
  return supabase
    .from("item_prices")
    .select("price, created_at, confidence, source")
    .eq("item_uuid", itemUuid)
    .gte("confidence", CONFIDENCE_THRESHOLD)
    .order("created_at", { ascending: true });
}
