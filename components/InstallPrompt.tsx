"use client";
import { useState, useEffect } from "react";

export default function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Log to console so you can check via remote debugging if needed
    console.log("Checking PWA status...");
    
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                         || (window.navigator as any).standalone === true;

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

    // If it's iOS and NOT in a standalone window, show it
    if (isIOS && !isStandalone) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div 
      style={{ zIndex: 9999 }} 
      className="fixed bottom-12 left-4 right-4 bg-blue-600 text-white p-6 rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border-2 border-white/20"
    >
      <div className="flex justify-between items-center mb-2">
        <span className="font-black italic uppercase tracking-tighter text-lg">System_Install</span>
        <button onClick={() => setShow(false)} className="text-xl">✕</button>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest leading-tight opacity-90">
        1. Tap the <span className="underline italic">Share Icon</span> at the bottom<br/>
        2. Select <span className="underline italic text-white">"Add to Home Screen"</span>
      </p>
    </div>
  );
}

