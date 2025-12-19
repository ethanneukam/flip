import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server only
);

type PriceSource = "flip_sale" | "external" | "manual";

export async function writePrice({
  itemUuid,
  price,
  source,
}: {
  itemUuid: string;
  price: number;
  source: PriceSource;
}) {
  let confidence = 0;

  if (source === "flip_sale") confidence = 60;
  if (source === "external") confidence = 30;
  if (source === "manual") confidence = 10;

  return supabase.from("item_prices").insert({
    item_uuid: itemUuid,
    price,
    confidence,
    source,
  });
}
