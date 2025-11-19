// components/MarketOverview.tsx
import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type PricePoint = { date: string; price: number; source: string };
type MarketResponse = {
  flipPrices: { date: string; price: number }[];
  externalPrices: { source: string; price: number; url?: string; last_checked?: string }[];
  history: { date: string; price: number; source: string }[]; // merged history for chart
};

export default function MarketOverview({ itemId }: { itemId: string }) {
  const [data, setData] = useState<MarketResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) return;
    setLoading(true);
    fetch(`/api/item/${itemId}/market-prices`)
      .then((r) => r.json())
      .then((res: MarketResponse) => {
        setData(res);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [itemId]);

  if (loading || !data) return <div className="p-4">Loading market data...</div>;

  // Build chart series: we'll pivot history by date, sources as separate lines
  // Expect `data.history` to contain {date, price, source}
  const dates = Array.from(new Set(data.history.map((h) => h.date))).sort();
  const seriesByDate = dates.map((d) => {
    const point: any = { date: d };
    data.history.forEach((h) => {
      if (h.date === d) point[h.source] = h.price;
    });
    return point;
  });

  // KPI: best external, avg, range
  const external = data.externalPrices;
  const bestExternal = external.length ? external.reduce((a, b) => (b.price < a.price ? b : a)) : null;
  const avgExternal = external.length ? Number((external.reduce((s, p) => s + p.price, 0) / external.length).toFixed(2)) : null;
  const low = external.length ? Math.min(...external.map((p) => p.price)) : null;
  const high = external.length ? Math.max(...external.map((p) => p.price)) : null;

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold">Market Snapshot</h3>
          <p className="text-sm text-gray-500">Live prices across Flip and the web</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Best price</div>
          <div className="font-bold text-lg">
            {bestExternal ? `$${bestExternal.price} (${bestExternal.source})` : "—"}
          </div>
          <div className="text-xs text-gray-400">{avgExternal ? `Avg: $${avgExternal}` : ""}</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="p-3 bg-gray-50 rounded">
          <div className="text-xs text-gray-500">Low</div>
          <div className="font-semibold">{low ? `$${low}` : "—"}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <div className="text-xs text-gray-500">Average</div>
          <div className="font-semibold">{avgExternal ? `$${avgExternal}` : "—"}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <div className="text-xs text-gray-500">High</div>
          <div className="font-semibold">{high ? `$${high}` : "—"}</div>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={seriesByDate} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {/* Render a line per source present in history (collect unique sources) */}
            {Array.from(new Set(data.history.map((h) => h.source))).map((source, idx) => (
              <Line
                key={source}
                type="monotone"
                dataKey={source}
                stroke={idx === 0 ? "#2563EB" : idx === 1 ? "#10B981" : "#EF4444"}
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Sources</h4>
        <ul className="space-y-2 text-sm">
          {data.externalPrices.map((p, i) => (
            <li key={i} className="flex items-center justify-between">
              <div>
                <strong>{p.source}</strong> {p.url ? (<a href={p.url} className="ml-2 text-blue-600" target="_blank" rel="noreferrer">link</a>) : null}
              </div>
              <div>${p.price}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}