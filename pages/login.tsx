import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import { Shield, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/terminal`,
      },
    });

    if (error) {
      setMessage(`ERROR: ${error.message}`);
    } else {
      setMessage("ACCESS_LINK_SENT: Check your inbox to initialize session.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center p-6 font-mono">
      <div className="w-full max-w-md border border-white/10 bg-white/5 p-8 rounded-sm shadow-2xl relative overflow-hidden">
        {/* Decorative Scanline */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-blue-500/50 shadow-[0_0_15px_blue]" />
        
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-blue-600/10 rounded-full border border-blue-500/20 mb-4">
            <Shield className="text-blue-500" size={32} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">Identity_Protocol</h1>
          <p className="text-[10px] text-gray-500 tracking-[0.3em] uppercase mt-2">Authorization Required for Vault Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Network_Email</label>
            <input 
              type="email"
              required
              placeholder="operator@network.com"
              className="w-full bg-black border border-white/10 p-3 text-sm focus:border-blue-500 outline-none transition-all placeholder:opacity-20"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "INITIALIZING..." : (
              <>Initialize Session <ArrowRight size={14} /></>
            )}
          </button>
        </form>

        {message && (
          <div className="mt-6 p-4 border border-blue-500/30 bg-blue-500/5 text-blue-400 text-[10px] leading-relaxed text-center uppercase tracking-wider">
            {message}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center opacity-30">
          <div className="flex items-center gap-1">
            <Lock size={10} />
            <span className="text-[8px] uppercase tracking-widest">v3.0 Secure</span>
          </div>
          <button 
            onClick={() => router.push('/')}
            className="text-[8px] uppercase tracking-widest hover:text-white"
          >
            Return to Terminal
          </button>
        </div>
      </div>
      
      <p className="mt-8 text-[9px] text-gray-600 uppercase tracking-[0.4em] font-light">
        Terminal_Infrastructure // Alpha_Access
      </p>
    </div>
  );
}