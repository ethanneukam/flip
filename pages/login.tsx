import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/router";
import { Shield, ArrowRight } from "lucide-react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginPage() {
  const router = useRouter();
  // IMPORTANT: Use this client to sync with Middleware cookies
  const supabase = createClientComponentClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAuth = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            emailRedirectTo: `${window.location.origin}/vault`,
          },
        });
        if (error) throw error;
        setMessage("PROTOCOL_INITIATED: Verify your email to activate the link.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Use a hard redirect to refresh the entire browser state with the new session
        window.location.href = "/vault"; 
      }
    } catch (err: any) {
      setMessage(`ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center p-6 font-mono">
      <div className="w-full max-w-md border border-white/10 bg-white/5 p-8 rounded-sm shadow-2xl relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-blue-500/50 shadow-[0_0_15px_blue]" />
        
        <div className="flex flex-col items-center mb-8">
          <Shield className="text-blue-500 mb-4" size={32} />
          <h1 className="text-2xl font-black uppercase italic">Identity_Protocol</h1>
          <p className="text-[10px] text-gray-500 tracking-[0.3em] uppercase mt-2">
            {isSignUp ? "Register Operator" : "Authorization Required"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            placeholder="Network_Email"
            className="w-full bg-black border border-white/10 p-3 text-xs outline-none focus:border-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Security_Key"
            className="w-full bg-black border border-white/10 p-3 text-xs outline-none focus:border-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? "PROCESSING..." : isSignUp ? "Create_Identity" : "Initialize_Session"}
            <ArrowRight size={14} />
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-[9px] text-gray-500 uppercase tracking-widest mt-6 hover:text-blue-400"
        >
          {isSignUp ? "Already recognized? Login" : "No Identity? Request Access"}
        </button>

        {message && (
          <div className={`mt-6 p-4 border text-[10px] uppercase text-center ${message.includes("ERROR") ? "border-red-500/30 text-red-400" : "border-blue-500/30 text-blue-400"}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}