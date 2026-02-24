import React, { useRef, useState } from 'react';
import { ShieldCheck, X, Zap } from 'lucide-react';

interface CameraScannerProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraScanner({ onCapture, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("ORACLE_SYSTEM_ERR: Camera access denied", err);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    // Trigger visual flash
    setIsCapturing(true);
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `scan_${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
      }
      setTimeout(() => setIsCapturing(false), 150);
    }, 'image/jpeg');
  };

  React.useEffect(() => {
    startCamera();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col font-mono text-green-500">
      {/* Header Overlay */}
      <div className="absolute top-0 inset-x-0 z-10 flex justify-between items-center p-6 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={onClose} className="p-2 border border-green-500/20 bg-black/50 backdrop-blur-md rounded-sm">
          <X size={20} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-green-500 animate-pulse">
            AI_ORACLE_SCANNING
          </span>
          <span className="text-[8px] text-green-800">FACING_MODE: ENV_PROXIMITY</span>
        </div>
        <div className="p-2 opacity-30"><ShieldCheck size={20} /></div>
      </div>

      {/* Video Feed */}
      <div className="flex-1 relative overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${isCapturing ? 'opacity-30' : 'opacity-80'}`}
        />
        
        {/* Scanning Reticle & Animation */}
        <div className="absolute inset-0 border-[1px] border-green-500/30 m-8 sm:m-16 rounded-sm pointer-events-none flex items-center justify-center overflow-hidden">
          {/* Corner Brackets */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-500" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-500" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-500" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-500" />
          
          {/* Moving Scan Line */}
          <div className="absolute w-full h-[2px] bg-green-500/50 shadow-[0_0_15px_#22c55e] animate-scan-line-fixed" />
          
          {/* Grid Overlay Texture */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        </div>

        {/* Captured Flash */}
        {isCapturing && <div className="absolute inset-0 bg-white z-50 animate-flash" />}
      </div>

      {/* Controls */}
      <div className="p-12 flex flex-col items-center space-y-4 bg-black border-t border-green-500/10">
        <p className="text-[9px] uppercase tracking-widest text-green-800">Align item within reticle</p>
        <button 
          onClick={capturePhoto}
          className="relative group p-1 border-2 border-green-500/30 rounded-full hover:border-green-500 transition-all"
        >
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center group-active:scale-90 transition-transform shadow-[0_0_20px_rgba(34,197,94,0.4)]">
             <Zap size={24} className="text-black" />
          </div>
        </button>
      </div>
{/* @ts-ignore */}
      <style jsx>{`
        @keyframes scan-line-fixed {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-line-fixed {
          animation: scan-line-fixed 3s ease-in-out infinite;
        }
        @keyframes flash {
          0% { opacity: 0.8; }
          100% { opacity: 0; }
        }
        .animate-flash {
          animation: flash 0.15s ease-out forwards;
        }
      `}</style>
    </div>
  );
}