// components/PriceChart.tsx
import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface PriceChartProps {
  data: { date: string; price: number }[];
}

const PriceChart: React.FC<PriceChartProps> = ({ data }) => {
  const [animatedData, setAnimatedData] = useState(data);

  // Update animatedData when new data comes in
  useEffect(() => {
    if (!data || data.length === 0) return;

    // If the new data has more points, add the last point after a small delay for smooth slide-in
    if (data.length > animatedData.length) {
      const newPoints = data.slice(animatedData.length);
      newPoints.forEach((point, i) => {
        setTimeout(() => {
          setAnimatedData((prev) => [...prev, point]);
        }, i * 200); // 0.2s between new points
      });
    } else {
      // Otherwise just replace all data
      setAnimatedData(data);
    }
  }, [data]);

  if (!animatedData || animatedData.length === 0) return null;

  const firstPrice = animatedData[0].price;
  const lastPrice = animatedData[animatedData.length - 1].price;
  const trendUp = lastPrice >= firstPrice;

  const lineColor = trendUp ? "#10b981" : "#ef4444"; // green/red
  const gradientId = trendUp ? "trendUpGradient" : "trendDownGradient";

  return (
    <div className="w-full h-60 bg-white rounded-xl p-2 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={animatedData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
          {/* Gradient fill */}
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
              <stop offset="75%" stopColor={lineColor} stopOpacity={0.05} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />

          {/* Axes */}
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
          />

          {/* Tooltip */}
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              padding: "8px",
            }}
            labelStyle={{ color: "#9ca3af" }}
            formatter={(value: any) => [`$${value}`, "Price"]}
          />

          {/* Animated price line */}
          <Line
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
            fill={`url(#${gradientId})`}
            isAnimationActive={true}
            animationDuration={600} // smooth slide
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;