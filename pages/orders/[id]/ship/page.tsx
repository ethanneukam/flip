"use client";
import { useState } from "react";

export default function SellerShippingLabel() {
  const [rateId, setRateId] = useState("");

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create Shipping Label</h1>

      <input
        placeholder="Rate ID"
        className="border p-2 w-full mb-3"
        onChange={(e) => setRateId(e.target.value)}
      />

      <button
        className="bg-black text-white px-4 py-2 rounded"
        onClick={async () => {
          const r = await fetch("/api/shipping/buy", {
            method: "POST",
            body: JSON.stringify({
              rateId,
              shipmentId: "temp-shipment",
            }),
          });

          const d = await r.json();
          console.log(d);
          alert("Label purchased (mock)");
        }}
      >
        Buy Label
      </button>
    </div>
  );
}
