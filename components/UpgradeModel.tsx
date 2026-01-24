import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Lock, Zap } from "lucide-react";
import { useRouter } from "next/router";

export function UpgradeModal({ 
  userTier, 
  onClose 
}: { 
  userTier: string, 
  onClose: () => void 
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden'; // Lock scroll
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  if (!mounted) return null;

  const handleUpgrade = () => {
    onClose();
    router.push('/pricing'); // <--- Sends them to your pricing page
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-[#0f0f0f] border border-red-500/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.2)]">
        
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-red-900/10">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-red-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-red-400">Restricted_Access</h3>
          </div>
          <button onClick={onClose} className="text-white/20 hover:text-white"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
            <Lock size={32} className="text-red-500" />
          </div>
          
        <div>
    <h2 className="text-xl font-black italic text-white mb-2 uppercase">Upgrade Required</h2>
    <p className="text-[10px] text-gray-400 font-mono leading-relaxed mb-4">
      CURRENT TIER: <span className="text-red-500">{userTier.toUpperCase()}</span>
    </p>
    <ul className="text-left text-[9px] space-y-2 mb-6 border-y border-white/5 py-4">
      <li className="flex justify-between"><span>LVL_01 Operative:</span> <span className="text-white">50 Items</span></li>
      <li className="flex justify-between"><span>LVL_02 Market Maker:</span> <span className="text-white">500 Items + Vision</span></li>
      <li className="flex justify-between"><span>LVL_03 Syndicate:</span> <span className="text-white">Unlimited</span></li>
    </ul>
  </div>

          <button 
            onClick={handleUpgrade}
            className="w-full py-4 bg-white text-black hover:bg-gray-200 font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <Zap size={16} fill="black" />
            Initialize Upgrade
          </button>
          
          <button onClick={onClose} className="text-[10px] text-gray-500 hover:text-white underline uppercase tracking-widest">
            Remain on Free Tier
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
