// components/common/FeatureGuard.tsx
import React from 'react';
import { PIVOT_CONFIG } from '../../lib/pivot';

interface FeatureGuardProps {
  feature: keyof typeof PIVOT_CONFIG.features;
  children: React.ReactNode;
  fallback?: React.ReactNode; // What to show if disabled (optional)
  mode?: 'hide' | 'inert'; // 'hide' removes it, 'inert' grays it out
}

export default function FeatureGuard({ 
  feature, 
  children, 
  fallback = null, 
  mode = 'hide' 
}: FeatureGuardProps) {
  const isEnabled = PIVOT_CONFIG.features[feature];

  if (isEnabled) {
    return <>{children}</>;
  }

  if (mode === 'inert') {
    return (
      <div className="opacity-40 pointer-events-none select-none grayscale relative group">
        {/* Optional: Add a tooltip-like overlay if clicked (though pointer-events-none stops clicks) */}
        {children}
        <div className="absolute inset-0 z-10 bg-white/10" aria-label="Feature deprecated" />
      </div>
    );
  }

  // If mode is 'hide', return fallback or null
  return <>{fallback}</>;
}
