"use client";

export default function SmartSummary({ item, externalPrices }) {
  if (!item) return null;

  const avgExternal =
    externalPrices && externalPrices.length > 0
      ? externalPrices.reduce((a, b) => a + b.price, 0) / externalPrices.length
      : null;

  const priceDiff =
    avgExternal !== null ? item.price - avgExternal : null;

  const isGoodDeal =
    priceDiff !== null ? priceDiff < 0 : false;

  return (
    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mt-4">
      <h2 className="text-lg font-semibold mb-1">AI Summary</h2>

      <p className="text-sm text-gray-700 leading-5">
        Based on similar listings, market trends, and current external prices:
      </p>

      {avgExternal !== null && (
        <p className="mt-2 text-sm">
          • Average internet price:{" "}
          <span className="font-semibold">${avgExternal.toFixed(2)}</span>
        </p>
      )}

      {priceDiff !== null && (
        <p className="text-sm">
          • This listing is{" "}
          <span
            className={
              isGoodDeal ? "text-green-600 font-semibold" : "text-red-600 font-semibold"
            }
          >
            {isGoodDeal
              ? `${Math.abs(priceDiff).toFixed(2)} cheaper`
              : `${Math.abs(priceDiff).toFixed(2)} above`}
          </span>{" "}
          typical prices.
        </p>
      )}

      <p className="text-sm mt-2">
        • Recommended because of category match, user interest, and price proximity.
      </p>
    </div>
  );
}
