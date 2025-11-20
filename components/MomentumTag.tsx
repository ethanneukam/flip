// components/MomentumTag.tsx
import React from "react";

export default function MomentumTag({ tag }: { tag: string }) {
  const styles: any = {
    Spiking: "bg-green-200 text-green-800",
    Pumping: "bg-green-100 text-green-700",
    Sideways: "bg-gray-100 text-gray-700",
    Cooling: "bg-yellow-100 text-yellow-700",
    Crashing: "bg-red-200 text-red-800",
  };

  const emojis: any = {
    Spiking: "🚀",
    Pumping: "🔥",
    Sideways: "😐",
    Cooling: "📉",
    Crashing: "💀",
  };

  const color =
    styles[tag] ||
    "bg-gray-100 text-gray-700"; // fallback so it never breaks

  return (
    <span className={`px-3 py-1 rounded-xl text-sm font-semibold ${color}`}>
      {emojis[tag]} {tag}
    </span>
  );
}
