// components/FlipScore.tsx
import React from "react";

interface FlipScoreProps {
  score: number; // 1-100
  volatility: "low" | "medium" | "high";
  recommendation: "buy" | "sell" | "hold";
}

export default function FlipScore({
  score,
  volatility,
  recommendation,
}: FlipScoreProps) {
  const recColors: any = {
    buy: "bg-green-100 text-green-700",
    hold: "bg-yellow-100 text-yellow-700",
    sell: "bg-red-100 text-red-700",
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border mb-4">
      <h3 className="font-bold text-lg mb-2">Flip Score</h3>

      {/* Score */}
      <div className="text-3xl font-extrabold mb-2">{score}/100</div>

      {/* Recommendation */}
      <div
        className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold ${recColors[recommendation]}`}
      >
        {recommendation === "buy" && "🟢 Strong Buy"}
        {recommendation === "hold" && "🟡 Hold"}
        {recommendation === "sell" && "🔴 Sell"}
      </div>

      {/* Volatility */}
      <p className="mt-3 text-sm text-gray-600">
        Volatility:{" "}
        {volatility === "low" && "Low (Stable Price)"}
        {volatility === "medium" && "Medium (Moderate Movement)"}
        {volatility === "high" && "High (Rapid Swings)"}
      </p>
    </div>
  );
}
