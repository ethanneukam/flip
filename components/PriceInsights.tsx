"use client";

export default function PriceInsights({ item, externalPrices }: any) {
  if (!item && !externalPrices) return null;

  const avg = externalPrices?.length
    ? externalPrices.reduce((s, p) => s + p.price, 0) / externalPrices.length
    : null;

  const lowest = externalPrices?.length
    ? Math.min(...externalPrices.map((p) => p.price))
    : null;

  const highest = externalPrices?.length
    ? Math.max(...externalPrices.map((p) => p.price))
    : null;

  // Simple classification
  const classification =
    avg && item.price
      ? item.price < avg * 0.8
        ? "Great Deal 🔥"
        : item.price < avg * 1.1
        ? "Fair Price 👍"
        : "Over Market 👀"
      : null;

  return (
    <section className="bg-white p-4 mt-6 rounded-xl shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Price Insights</h2>

      {classification && (
        <p className="font-semibold text-blue-600 mb-2">{classification}</p>
      )}

      {avg && (
        <p className="text-sm">Average Market: ${avg.toFixed(2)}</p>
      )}
      {lowest && (
        <p className="text-sm text-green-700">Lowest Found: ${lowest}</p>
      )}
      {highest && (
        <p className="text-sm text-red-600">Highest Found: ${highest}</p>
      )}

      {/* external sources */}
      {externalPrices?.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium mb-1">Verified Prices:</p>
          {externalPrices.map((p, i) => (
            <p key={i} className="text-xs text-gray-600">
              ${p.price} — {p.source}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
