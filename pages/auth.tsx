import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Shield, Zap, BarChart3, ChevronRight } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace("/feed");
    };
    checkUser();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: "Verification link sent to email." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/feed");
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col md:flex-row">

  {/* TOP SECTION: The Logo Hero */}
  <div className="relative z-10 flex flex-col items-center md:items-start justify-center pt-12 md:pt-0">
    <div className="w-full max-w-[280px] md:max-w-[450px] lg:max-w-[550px] transition-all duration-500">
      <img 
        src="/logo.png" 
        alt="FLIP Logo" 
        className="w-full h-auto object-contain brightness-0 invert opacity-100 drop-shadow-[0_0_30px_rgba(59,130,246,0.2)]"
      />
    </div>
  </div>

  {/* BOTTOM SECTION: Text and Features */}
  <div className="mt-auto pt-16 relative z-10">
    <div className="mb-12">
      <p className="text-gray-400 text-2xl md:text-4xl font-black tracking-tight leading-[1.1] border-l-4 border-blue-500 pl-6 max-w-xl">
        The financial terminal for your <br />
        <span className="text-white uppercase italic tracking-tighter">physical net worth.</span>
      </p>
    </div>

    {/* Feature List (Instant Evaluation) */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 max-w-2xl">
      <div className="flex items-start space-x-4 group">
        <div className="mt-1 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/30 transition-all">
          <Zap className="text-blue-500" size={24} />
        </div>
        <div>
          <h4 className="text-white font-black uppercase tracking-[0.2em] text-[10px] mb-1">Instant Valuation</h4>
          <p className="text-gray-500 text-xs leading-relaxed">Real-time market pricing via Oracle v3 global data stream.</p>
        </div>
      </div>

          <div className="flex items-start space-x-4">
            <div className="mt-1 w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
              <Shield size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-white">Vault Security</p>
              <p className="text-xs text-gray-500 font-medium mt-1">Military-grade tracking for your high-value inventory.</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="mt-1 w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
              <BarChart3 size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-white">Market Oracle</p>
              <p className="text-xs text-gray-500 font-medium mt-1">Live volatility alerts and global price indices.</p>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">
            System Status: Connected // Oracle v4.2
          </p>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white text-black rounded-t-[40px] md:rounded-t-none md:rounded-l-[40px]">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black tracking-tight uppercase italic">
              {isSignUp ? "Initialize Vault" : "Terminal Access"}
            </h2>
            <p className="text-gray-500 text-sm font-medium mt-2">
              {isSignUp ? "Create your credentials to begin" : "Enter your access keys below"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">
                Identifier / Email
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all font-medium"
                placeholder="name@terminal.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">
                Access Key / Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {message && (
              <div className={`p-4 rounded-2xl text-xs font-bold text-center uppercase tracking-wider ${
                message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-800 transition-all disabled:opacity-70 flex items-center justify-center shadow-xl shadow-black/10"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <span className="flex items-center">
                  {isSignUp ? "Establish Connection" : "Authorize Access"}
                  <ChevronRight size={16} className="ml-2" />
                </span>
              )}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage(null);
              }}
              className="text-xs font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-widest"
            >
              {isSignUp ? "Existing Agent? Log in" : "New Operator? Request Access"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
