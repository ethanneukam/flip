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
      
  {/* LOGO AREA: Massive and dominant in the top corner */}
  <div className="relative md:absolute md:top-12 md:left-12 z-10 w-full flex justify-center md:justify-start">
    <div className="w-[85%] max-w-[320px] md:max-w-none md:w-[550px] lg:w-[700px] transition-all duration-500">
      <img 
        src="/logo.png" 
        alt="FLIP Logo" 
        className="w-full h-auto object-contain brightness-0 invert drop-shadow-[0_0_50px_rgba(59,130,246,0.35)]"
      />
    </div>
  </div>

  {/* SPACER: Prevents mobile overlap since the logo is absolute on desktop */}
  <div className="h-[30vh] md:hidden"></div>

  {/* BOTTOM CONTENT: Only the Feature List remains */}
  <div className="mt-auto relative z-20">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10 max-w-5xl border-t border-white/10 pt-12 bg-black/20 backdrop-blur-sm p-6 rounded-2xl">
      
      {/* Instant Valuation */}
      <div className="flex items-start space-x-5 group">
        <div className="mt-1 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/40 group-hover:border-blue-500/50 transition-all duration-300">
          <Zap className="text-blue-400" size={28} />
        </div>
        <div>
          <h4 className="text-white font-black uppercase tracking-[0.25em] text-[11px] mb-2 shadow-blue-500/20 shadow-sm">Instant Valuation</h4>
          <p className="text-gray-500 text-sm leading-relaxed font-medium">Real-time market pricing via Oracle v3 global data stream.</p>
        </div>
      </div>

      {/* Vault Security */}
      <div className="flex items-start space-x-5 group">
        <div className="mt-1 p-3 rounded-xl bg-green-500/10 border border-green-500/20 group-hover:bg-green-500/40 group-hover:border-green-500/50 transition-all duration-300">
          <Shield size={24} className="text-green-400" />
        </div>
        <div>
          <h4 className="text-white font-black uppercase tracking-[0.25em] text-[11px] mb-2 shadow-green-500/20 shadow-sm">Vault Security</h4>
          <p className="text-gray-500 text-sm leading-relaxed font-medium">Military-grade tracking for high-value inventory.</p>
        </div>
      </div>

      {/* Market Oracle */}
      <div className="flex items-start space-x-5 group">
        <div className="mt-1 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 group-hover:bg-purple-500/40 group-hover:border-purple-500/50 transition-all duration-300">
          <BarChart3 size={24} className="text-purple-400" />
        </div>
        <div>
          <h4 className="text-white font-black uppercase tracking-[0.25em] text-[11px] mb-2 shadow-purple-500/20 shadow-sm">Market Oracle</h4>
          <p className="text-gray-500 text-sm leading-relaxed font-medium">Live volatility alerts and global price indices.</p>
        </div>
      </div>

    </div>
  </div>

  {/* BACKGROUND GRID: Added extra opacity to fill the void where the text was */}
  <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none" 
       style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
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
