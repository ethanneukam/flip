import { shipEngine } from "@/lib/shipengine";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { from, to, weightOz } = await req.json();

  const rates = await shipEngine("rates", {
    rate_options: { carrier_ids: ["se-123"] }, // replace Sunday with real carrier ID
    shipment: {
      ship_to: to,
      ship_from: from,
      packages: [{ weight: { value: weightOz, unit: "ounce" } }],
    },
  });

  return NextResponse.json({ rates });
}
