"use client";
import { useState, useEffect } from "react";

export default function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 1. Check if already installed/standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                         || (window.navigator as any).standalone === true;

    // 2. Check if the user is on an iPhone/iPad
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    // 3. Only show if on iOS and NOT already installed
    if (isIOS && !isStandalone) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-10 left-4 right-4 bg-blue-600 text-white p-5 rounded-3xl z-[999] flex flex-col gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-blue-400/30 animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="flex justify-between items-start">
        <h3 className="font-black italic text-lg tracking-tighter uppercase">Install Oracle Terminal</h3>
        <button onClick={() => setShow(false)} className="bg-black/20 p-1 rounded-full px-3 text-sm">✕</button>
      </div>
      <p className="text-[11px] leading-tight font-medium opacity-90 uppercase tracking-wider">
        To use FLIP as a native app: <br/>
        1. Tap the <span className="bg-white text-blue-600 px-1.5 py-0.5 rounded font-bold italic text-[10px]">SHARE</span> icon (square with arrow) <br/>
        2. Select <span className="font-bold underline text-white italic text-[10px]">ADD TO HOME SCREEN</span>
      </p>
    </div>
  );
}
