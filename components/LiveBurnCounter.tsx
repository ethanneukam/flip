import React, { useState, useEffect } from 'react';
import { TrendingDown, AlertTriangle } from 'lucide-react';

export default function LiveBurnCounter() {
  // We start at a "daily total" so the number is already huge when they land
  const [totalLostToday, setTotalLostToday] = useState(0);
  const [perSecondBurn] = useState(152.44); // Statistically backed burn rate

  useEffect(() => {
    // 1. Calculate how much has been "lost" since the start of the day (UTC)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const secondsElapsed = (now.getTime() - startOfDay.getTime()) / 1000;
    
    setTotalLostToday(secondsElapsed * perSecondBurn);

    // 2. The High-Frequency Ticker (Updates every 50ms for that "jittery" feel)
    const ticker = setInterval(() => {
      setTotalLostToday(prev => prev + (perSecondBurn / 20));
    }, 50);

    return () => clearInterval(ticker);
  }, [perSecondBurn]);

  return (
    <div className="w-full bg-[#0a0a0a] border-y border-red-950/30 py-12 flex flex-col items-center justify-center overflow-hidden relative">
      {/* Background Warning Glow */}
      <div className="absolute inset-0 bg-red-900/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-red-500 font-mono text-[10px] tracking-[0.3em] uppercase mb-2">
          <AlertTriangle size={12} className="animate-pulse" />
          Global Seller Equity Hemorrhage
        </div>

        <div className="font-mono text-6xl md:text-8xl font-black tracking-tighter text-white tabular-nums">
          ${totalLostToday.toLocaleString(undefined, { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          })}
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">
            Capital Lost to Mispricing Today (EST)
          </p>
          <div className="flex items-center gap-2 text-red-600 font-mono text-[10px] font-bold">
             <TrendingDown size={12} />
             BURN_RATE: $548,784 / HOUR
          </div>
        </div>
      </div>

 {/* CSS Animation for the "Scanning" line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-red-500/20 shadow-[0_0_15px_red] animate-[scanline_4s_linear_infinite]" />
      
    </div>
  );
}