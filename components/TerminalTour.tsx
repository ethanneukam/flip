import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Terminal, Zap } from 'lucide-react';
import { useRouter } from 'next/router';
import TourSpotlight from './TourSpotlight';

const TOUR_STEPS = [
  { title: "SYSTEM_INIT", body: "Authentication successful. Initializing Flip Oracle v1.0...", route: "/feed" },
  { title: "GLOBAL_FEED", body: "This is the heartbeat. Real-time entries from the global secondary market. See what's moving before the crowd.", route: "/feed", selector: "#global-feed" },
  { title: "THE_ORACLE_ENGINE", body: "Let's move to the Terminal. This is where we extract margin from market fragmentation.", route: "/charts" },
  { title: "TICKER_SEARCH", body: "Input any asset. We don't just search—we scrape global liquidity across 15+ platforms.", route: "/charts", selector: "#ticker-input" },
  { title: "ARBITRAGE_ANALYSIS", body: "Look here for the 'Spread'. If a Rolex is $2k cheaper in Tokyo than NYC, we flag it instantly.", route: "/charts", selector: "#arb-card" },
  { title: "LANDED_COSTS", body: "We factor in customs, duties, and shipping. The 'Net Profit' you see is real, not a guess.", route: "/charts", selector: "#profit-calc" },
  { title: "THE_SECURE_VAULT", body: "Now, let's look at your inventory. Everything you own is a tradable asset.", route: "/vault" },
  { title: "AI_VISION_SCAN", body: "Don't type. Just aim your camera. Our Google Vision integration IDs the item and pulls the SKU.", route: "/vault", selector: "#scan-trigger" },
  { title: "NET_WORTH_TRACKER", body: "Your vault value updates as the market moves. Total transparency on your physical equity.", route: "/vault", selector: "#net-worth-card" },
  { title: "EXECUTE_OPS", body: "Ready to move an item? The Ops Center handles the escrow and shipping logistics.", route: "/ops" },
  { title: "SYSTEM_READY", body: "The Terminal is yours. Go find the margin.", route: "/feed" }
];

export default function TerminalTour() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('oracle_tour_complete');
    // Trigger only after auth redirect is stable
    if (!hasSeenTour && router.pathname !== '/auth') {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [router.pathname]);

  const handleNext = async () => {
    const nextStep = step + 1;
    if (nextStep >= TOUR_STEPS.length) {
      endTour();
      return;
    }

    // Navigation Logic: If the next step is on a different page, move the user
    if (TOUR_STEPS[nextStep].route !== router.pathname) {
      await router.push(TOUR_STEPS[nextStep].route);
      // Wait for page transition
      setTimeout(() => setStep(nextStep), 500);
    } else {
      setStep(nextStep);
    }
  };

  const endTour = () => {
    setIsVisible(false);
    localStorage.setItem('oracle_tour_complete', 'true');
    router.push('/dashboard');
  };

  if (!isVisible) return null;

  return (
    <>
      {/* 1. The Dimmer/Spotlight Layer */}
      <AnimatePresence>
        <TourSpotlight selector={TOUR_STEPS[step].selector} />
      </AnimatePresence>

      {/* 2. The Interface Layer */}
      <div className="fixed inset-0 z-[9999] flex items-end justify-center p-6 pointer-events-none">
        {/* Semi-transparent background that is clickable to close */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="absolute inset-0 bg-black/20 pointer-events-auto" 
          onClick={endTour} 
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="relative w-full max-w-lg bg-[#0D0D0D] border border-blue-500/40 shadow-[0_0_50px_rgba(37,99,235,0.4)] rounded-xl p-6 pointer-events-auto overflow-hidden"
          >
            {/* Progress Bar */}
            <div 
                className="absolute top-0 left-0 h-1 bg-blue-600 transition-all duration-500" 
                style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }} 
            />

            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-blue-500 animate-pulse" />
                <span className="text-[10px] font-black tracking-[0.3em] text-blue-400 uppercase">Step_{step + 1}_of_{TOUR_STEPS.length}</span>
              </div>
              <button onClick={endTour} className="text-gray-600 hover:text-white"><X size={18} /></button>
            </div>

            <h3 className="text-lg font-black italic uppercase tracking-tighter mb-2 italic">
              {TOUR_STEPS[step].title}
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed font-medium mb-6">
              {TOUR_STEPS[step].body}
            </p>

            <div className="flex justify-between items-center">
              <span className="text-[9px] text-blue-500/50 font-mono italic tracking-widest uppercase">Target_Sector: {TOUR_STEPS[step].route}</span>
              <button 
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
              >
                {step === TOUR_STEPS.length - 1 ? 'Execute_Access' : 'Next_Phase'} <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}