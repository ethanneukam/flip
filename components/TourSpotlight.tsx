import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function TourSpotlight({ selector }: { selector?: string }) {
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!selector) {
      setCoords(null);
      return;
    }

    const updateCoords = () => {
      const el = document.querySelector(selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    return () => window.removeEventListener('resize', updateCoords);
  }, [selector]);

  if (!coords) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[9998] pointer-events-none"
      style={{
        background: `radial-gradient(circle ${Math.max(coords.width, coords.height) / 1.5 + 20}px at ${coords.left + coords.width / 2}px ${coords.top + coords.height / 2}px, transparent 100%, rgba(0,0,0,0.85) 0%)`
      }}
    />
  );
}