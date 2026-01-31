"use client";
import { useState, useEffect } from "react";

export default function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (navigator.userAgent.includes('iPhone') && !isStandalone) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 bg-blue-600 text-white p-4 rounded-2xl z-[200] flex justify-between items-center shadow-2xl animate-bounce">
      <p className="text-xs font-bold uppercase tracking-tighter">
        Install FLIP: Tap "Share" then "Add to Home Screen"
      </p>
      <button onClick={() => setShow(false)} className="font-black">✕</button>
    </div>
  );
}
