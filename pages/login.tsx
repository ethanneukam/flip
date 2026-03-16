import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import { Shield, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

 // Inside your LoginPage handleAuth function:
const handleAuth = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      let error: { message: string } | null = null;

      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/terminal` },
        });
        error = signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        error = signInError;
        
        // SUCCESS: Redirect to Terminal immediately
        if (!error) {
          router.push("/terminal"); 
          return; // Prevent further execution
        }
      }

      if (error) {
        setMessage(`ERROR: ${error.message}`);
      } else if (isSignUp) {
        setMessage("PROTOCOL_INITIATED: Check email to verify identity.");
      }
    } catch {
      setMessage("SYSTEM_CRITICAL: Authentication service unreachable.");
    } finally {
      setLoading(false);
    }
};

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center p-6 font-mono">
      <div className="w-full max-w-md border border-white/10 bg-white/5 p-8 rounded-sm shadow-2xl relative overflow-hidden">
        
        <div className="absolute inset-x-0 top-0 h-[1px] bg-blue-500/50 shadow-[0_0_15px_blue]" />

        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-blue-600/10 rounded-full border border-blue-500/20 mb-4">
            <Shield className="text-blue-500" size={32} />
          </div>

          <h1 className="text-2xl font-black tracking-tighter uppercase italic">
            Identity_Protocol
          </h1>

          <p className="text-[10px] text-gray-500 tracking-[0.3em] uppercase mt-2 text-center">
            {isSignUp
              ? "Register New Operator"
              : "Authorization Required for Asset Monitor"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">

          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
              Network_Email
            </label>

            <input
              type="email"
              required
              placeholder="operator@network.com"
              className="w-full bg-black border border-white/10 p-3 text-xs focus:border-blue-500 outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
              Security_Key
            </label>

            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full bg-black border border-white/10 p-3 text-xs focus:border-blue-500 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading
              ? "PROCESSING..."
              : isSignUp
              ? "Create_Identity"
              : "Initialize_Session"}

            {!loading && <ArrowRight size={14} />}
          </button>

          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-[9px] text-gray-500 uppercase tracking-widest mt-2 hover:text-blue-400 transition-colors"
          >
            {isSignUp
              ? "Already recognized? Login"
              : "No Identity? Request Access"}
          </button>

        </form>

        {message && (
          <div
            className={`mt-6 p-4 border text-[10px] uppercase tracking-wider text-center ${
              message.includes("ERROR")
                ? "border-red-500/30 bg-red-500/5 text-red-400"
                : "border-blue-500/30 bg-blue-500/5 text-blue-400"
            }`}
          >
            {message}
          </div>
        )}

      </div>

      <button
        onClick={() => router.push("/terminal")}
        className="mt-8 text-[9px] text-gray-600 uppercase tracking-[0.4em] hover:text-white transition-colors"
      >
        Return_To_Terminal
      </button>
    </div>
  );
}