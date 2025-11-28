"use client";
import { useEffect, useState } from "react";

export default function AddressPicker({ userId, onSelect }: any) {
  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    fetch("/api/address/list", {
      method: "POST",
      body: JSON.stringify({ userId }),
    })
      .then((r) => r.json())
      .then((d) => setAddresses(d.addresses));
  }, []);

  return (
    <select
      className="w-full p-2 border rounded"
      onChange={(e) =>
        onSelect(addresses.find((a) => a.id === e.target.value))
      }
    >
      <option value="">Select Address</option>
      {addresses.map((a: any) => (
        <option key={a.id} value={a.id}>
          {a.name} — {a.city}, {a.state}
        </option>
      ))}
    </select>
  );
}
