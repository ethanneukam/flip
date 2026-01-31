import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ShieldCheck, FileText, Lock } from "lucide-react";

export default function ComplianceModal({ userId, onComplete }: { userId: string, onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ fullName: "", country: "" });

  const handleCompliance = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        kyc_status: 'verified',
        tos_accepted_at: new Date().toISOString(),
        identity_data: formData
      })
      .eq("id", userId);

    if (!error) onComplete();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white text-black w-full max-auto max-w-lg rounded-[32px] p-8 shadow-2xl">
        {step === 1 ? (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
              <FileText size={32} />
            </div>
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Terms of Protocol</h2>
            <div className="max-h-48 overflow-y-auto text-sm text-gray-500 pr-2 font-medium leading-relaxed">
              <p>By accessing the Oracle v3 stream, you agree that price data is for informational purposes only. FLIP is not responsible for market volatility or trading losses.</p>
              <p className="mt-4 font-bold text-black italic underline">Strictly no high-frequency botting of the manual terminal endpoints.</p>
            </div>
            <button 
              onClick={() => setStep(2)}
              className="w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest"
            >
              I Accept Terms
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Identity Verification</h2>
            <div className="space-y-4">
              <input 
                placeholder="LEGAL FULL NAME"
                className="w-full p-4 bg-gray-100 rounded-xl font-bold uppercase text-xs"
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              />
              <input 
                placeholder="RESIDENT COUNTRY"
                className="w-full p-4 bg-gray-100 rounded-xl font-bold uppercase text-xs"
                onChange={(e) => setFormData({...formData, country: e.target.value})}
              />
            </div>
            <button 
              onClick={handleCompliance}
              disabled={loading || !formData.fullName}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50"
            >
              {loading ? "VERIFYING..." : "FINALIZE IDENTITY"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
