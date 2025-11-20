// components/TrendBadge.tsx
import React from "react";

interface TrendBadgeProps {
  percentChange: number; // e.g. +4.3 or -2.1
}

export default function TrendBadge({ percentChange }: TrendBadgeProps) {
  const isUp = percentChange > 0;
  const isDown = percentChange < 0;

  return (
    <div
      className={`
        inline-block px-3 py-1 rounded-xl text-sm font-semibold
        ${isUp ? "bg-green-100 text-green-700" : ""}
        ${isDown ? "bg-red-100 text-red-700" : ""}
        ${!isUp && !isDown ? "bg-gray-100 text-gray-600" : ""}
      `}
    >
      {isUp && `📈 Up ${percentChange.toFixed(1)}% this week`}
      {isDown && `📉 Down ${percentChange.toFixed(1)}% this week`}
      {!isUp && !isDown && "➖ No significant change"}
    </div>
  );
}
