import React, { useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, Circle } from 'lucide-react';

interface CameraScannerProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraScanner({ onCapture, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPhoto, setHasPhoto] = useState(false);

  // Start the back camera (environment mode)
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
      console.error("Camera access denied", err);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "scan.jpg", { type: "image/jpeg" });
        onCapture(file);
        setHasPhoto(true);
      }
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
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      <div className="flex justify-between p-6 text-white">
        <button onClick={onClose} className="font-bold text-xs uppercase tracking-widest">Cancel</button>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Oracle Scan Active</span>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Scanning Reticle */}
        <div className="absolute inset-0 border-[2px] border-white/20 m-12 rounded-[40px] pointer-events-none flex items-center justify-center">
             <div className="w-full h-[1px] bg-blue-500/50 shadow-[0_0_15px_blue] animate-scan-line" />
        </div>
      </div>

      <div className="p-12 flex justify-center items-center bg-black">
        <button 
          onClick={capturePhoto}
          className="w-20 h-20 bg-white rounded-full flex items-center justify-center active:scale-90 transition-transform"
        >
          <div className="w-16 h-16 border-4 border-black rounded-full" />
        </button>
      </div>

      <style jsx>{`
        @keyframes scan-line {
          0% { transform: translateY(-150px); }
          100% { transform: translateY(150px); }
        }
        .animate-scan-line {
          animation: scan-line 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
