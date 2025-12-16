import { shipEngine } from "@/lib/shipengine";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { rateId, shipmentId } = await req.json();

  const label = await shipEngine("labels", {
    rate_id: rateId,
  });

  // await prisma.shipment.update({
  //   where: { id: shipmentId },
  //   data: {
  //     labelUrl: label.label_download.href,
  //     trackingNumber: label.tracking_number,
  //     carrier: label.carrier_id,
  //     status: "purchased",
  //   },
  // });

  return NextResponse.json({ success: true, label });
}
