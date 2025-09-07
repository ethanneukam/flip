// pages/dashboard.tsx

import { useState } from "react";

export default function Dashboard() {
  const [sneaker, setSneaker] = useState("");
  const [price, setPrice] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const analyzeFlip = async () => {
    console.log("Analyze Flip triggered");

    setLoading(true);
    setResult("");

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sneaker, price }),
    });

    const data = await response.json();
    setResult(data.result);
    setLoading(false);
  };

  return (
  <main className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
  <h1 className="text-4xl font-extrabold mb-8 text-gray-800">Sneaker Flip Analyzer</h1>

  <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-lg">
        <input
          type="text"
          placeholder="Enter sneaker name (e.g. Jordan 1 Retro High Bred)"
          value={sneaker}
          onChange={(e) => setSneaker(e.target.value)}
          className="w-full p-3 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
        />

        <input
          type="number"
          placeholder="Purchase price (optional)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full p-3 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={analyzeFlip}
          disabled={loading || !sneaker}
          className={`w-full px-4 py-3 rounded-md text-white ${
 	 loading || !sneaker ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
           }`}
        >
          {loading ? "Analyzing..." : "Analyze Flip"}
        </button>

       {loading && <p className="mt-4 text-gray-600">Analyzing...</p>}

{!loading && result && (
  <div className="mt-6 bg-gray-50 p-4 rounded border">
    <h2 className="text-lg font-semibold mb-2">AI's Verdict:</h2>
   <p className="text-gray-800 whitespace-pre-wrap">{result}</p>
  </div>
)}

{!loading && !result && (
  <p className="mt-4 text-red-500">No result yet. Enter a sneaker and price to analyze.</p>
)}

        )}
      </div>
    </main>
  );
}
