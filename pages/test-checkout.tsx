// pages/test-checkout.tsx
import { useState } from "react";

export default function TestCheckout() {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Demo Item", price: 10 }), // $10
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        {loading ? "Redirecting..." : "Buy Test Item ($10)"}
      </button>
    </div>
  );
}