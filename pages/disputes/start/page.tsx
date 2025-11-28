"use client";
import { useState } from "react";

export default function StartDisputePage() {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Start a Dispute</h1>

      <label className="text-sm font-semibold">Reason</label>
      <select
        className="p-2 border rounded w-full mb-4"
        onChange={(e) => setReason(e.target.value)}
      >
        <option value="">Select...</option>
        <option value="not_received">Item not received</option>
        <option value="not_as_described">Item not as described</option>
        <option value="damaged">Item arrived damaged</option>
      </select>

      <label className="text-sm font-semibold">Details</label>
      <textarea
        className="p-2 border rounded w-full mb-4"
        rows={4}
        onChange={(e) => setDetails(e.target.value)}
      />

      <label className="text-sm font-semibold">Evidence</label>
      <input
        type="file"
        multiple
        className="mb-4"
        onChange={(e) => {
          const urls = Array.from(e.target.files!).map((f) =>
            URL.createObjectURL(f)
          );
          setEvidence(urls);
        }}
      />

      <button
        className="bg-black text-white py-2 px-4 rounded"
        onClick={async () => {
          await fetch("/api/disputes/create", {
            method: "POST",
            body: JSON.stringify({
              listingId: "temp",
              orderId: "temp",
              buyerId: "temp",
              sellerId: "temp",
              reason,
              details,
              evidenceUrls: evidence,
            }),
          });
          alert("Dispute started");
        }}
      >
        Submit Dispute
      </button>
    </div>
  );
}
