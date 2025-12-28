// components/vault/NetWorthCard.tsx
import React from 'react';
import { Lock, TrendingUp, TrendingDown, EyeOff } from 'lucide-react';

interface NetWorthProps {
  totalValue: number;
  dayChangeAbs: number;
  dayChangePct: number;
  isLoading: boolean;
}

export default function NetWorthCard({ totalValue, dayChangeAbs, dayChangePct, isLoading }: NetWorthProps) {
  if (isLoading) {
    return <div className="h-48 bg-gray-100 animate-pulse rounded-xl mx-4 mt-4" />;
  }

  const isPositive = dayChangePct >= 0;

  return (
    <div className="mx-4 mt-6 p-6 bg-black text-white rounded-2xl shadow-xl relative overflow-hidden">
      {/* Background Decorative Blob */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-gray-800 rounded-full blur-3xl opacity-50" />

      {/* Header: Private Indicator */}
      <div className="flex items-center space-x-2 text-gray-400 mb-2">
        <Lock size={12} />
        <span className="text-[10px] uppercase tracking-widest font-bold">Vault Value (Private)</span>
      </div>

      {/* Main Value */}
      <div className="text-4xl font-bold tracking-tight mb-4">
        ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>

      {/* Daily Change */}
      <div className="flex items-center space-x-3">
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-md text-sm font-medium ${isPositive ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span>
            {isPositive ? '+' : ''}{dayChangeAbs.toFixed(2)} ({dayChangePct.toFixed(2)}%)
          </span>
        </div>
        <span className="text-xs text-gray-500">Last 24h</span>
      </div>

      {/* Privacy Toggle Visual */}
      <div className="absolute top-6 right-6 text-gray-600">
        <EyeOff size={20} />
      </div>
    </div>
  );
}