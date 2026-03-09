import React, { useState, useEffect } from "react";

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress === 100) return 100;
        const diff = Math.random() * 15;
        return Math.min(oldProgress + diff, 100);
      });
    }, 150);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: '#080808',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center'
    }}>
      {/* Branding */}
      <img 
        src="/logo.png" 
        alt="FLIP" 
        style={{ height: '32px', marginBottom: '40px', filter: 'brightness(0) invert(1)' }} 
      />

      {/* The Bar */}
      <div style={{ width: '200px', height: '2px', backgroundColor: 'rgba(255,255,255,0.1)', position: 'relative' }}>
        <div 
          className="terminal-loader-bar"
          style={{ 
            height: '100%', 
            width: `${progress}%`, 
            backgroundColor: '#e8ff47',
            boxShadow: '0 0 15px rgba(232,255,71,0.5)'
          }} 
        />
      </div>

      {/* Metadata Text */}
      <div style={{ 
        marginTop: '16px', 
        fontFamily: 'DM Mono, monospace', 
        fontSize: '9px', 
        letterSpacing: '0.3em', 
        color: 'rgba(255,255,255,0.3)',
        textTransform: 'uppercase'
      }}>
        Establishing_Link... {Math.round(progress)}%
      </div>
    </div>
  );
}