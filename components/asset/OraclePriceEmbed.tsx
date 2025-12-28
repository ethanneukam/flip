// components/asset/OraclePriceEmbed.tsx
import { useEffect, useState } from 'react';
import { Activity, Info } from 'lucide-react';
import { getOracleDataBySKU } from '../../lib/oracle-api';
import { OracleMetric } from '../../types/core';

export default function OraclePriceEmbed({ sku }: { sku: string }) {
  const [data, setData] = useState<OracleMetric | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sku) {
      getOracleDataBySKU(sku).then(res => {
        setData(res);
        setLoading(false);
      });
    }
  }, [sku]);

  if (loading) return <div className="h-20 w-full animate-pulse bg-gray-100 rounded-xl" />;
  if (!data) return null;

  return (
    <div className="bg-black text-white p-5 rounded-2xl shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Oracle Price</p>
          <h2 className="text-3xl font-black italic tracking-tighter">
            ${data.current_price.toLocaleString()}
          </h2>
        </div>
        <div className={`px-2 py-1 rounded font-bold text-xs ${data.day_change_percentage >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
          {data.day_change_percentage > 0 ? '+' : ''}{data.day_change_percentage}%
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <div className="flex items-center space-x-2">
          <Activity size={14} className="text-blue-400" />
          <span className="text-[10px] font-bold uppercase">Confidence: {data.confidence_score}%</span>
        </div>
        <div className="flex items-center space-x-1 text-gray-400">
          <Info size={12} />
          <span className="text-[9px] uppercase font-medium">Verified SKU: {sku}</span>
        </div>
      </div>
    </div>
  );
}
