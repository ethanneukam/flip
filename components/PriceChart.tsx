import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

type PriceData = {
  date: string; // ISO string or formatted date
  price: number;
};

interface PriceChartProps {
  data: PriceData[];
}

const PriceChart: React.FC<PriceChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="price" stroke="#8884d8" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default PriceChart;