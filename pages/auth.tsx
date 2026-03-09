import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Shield, Zap, BarChart3, ChevronRight, Activity } from "lucide-react";
import ComplianceModal from "@/components/ComplianceModal";

// ─── Static data ───────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  { label: "SNEAKERS",      val: "+8.3%",  up: true  },
  { label: "WATCHES",       val: "+2.1%",  up: true  },
  { label: "CARS",          val: "-1.4%",  up: false },
  { label: "COMICS",        val: "+14.2%", up: true  },
  { label: "PHONES",        val: "-2.9%",  up: false },
  { label: "FINE ART",      val: "+22.1%", up: true  },
  { label: "GAMING",        val: "+5.5%",  up: true  },
  { label: "JEWELRY",       val: "+4.2%",  up: true  },
  { label: "VINTAGE",       val: "+9.7%",  up: true  },
  { label: "TRADING CARDS", val: "+31.6%", up: true  },
  { label: "HANDBAGS",      val: "+6.8%",  up: true  },
  { label: "WHISKEY",       val: "-0.7%",  up: false },
  { label: "STREETWEAR",    val: "+12.3%", up: true  },
  { label: "CRYPTO",        val: "-4.1%",  up: false },
  { label: "ANTIQUES",      val: "+3.3%",  up: true  },
];

const LIVE_PRICES = [
  { item: "Jordan 4 Retro 'White Cement' Sz10", price: "$347",    change: "+8.3%",  up: true  },
  { item: "Rolex Submariner 126610LN",           price: "$14,200", change: "+2.1%",  up: true  },
  { item: "2019 Porsche 911 Carrera S",          price: "$98,500", change: "-1.4%",  up: false },
  { item: "Amazing Fantasy #15 CGC 4.0",         price: "$28,750", change: "+14.2%", up: true  },
  { item: "iPhone 15 Pro Max 256GB Mint",        price: "$820",    change: "-2.9%",  up: false },
  { item: "Basquiat Lithograph Signed",          price: "$4,100",  change: "+22.1%", up: true  },
  { item: "Pokemon Charizard Holo 1st Ed.",      price: "$9,600",  change: "+31.6%", up: true  },
  { item: "Hermes Birkin 30 Togo Gold",          price: "$18,900", change: "+6.8%",  up: true  },
];

const CATEGORIES = [
  "Sneakers","Watches","Cars","Motorcycles","Houses","Collectibles","Comics",
  "Trading Cards","Fine Art","Jewelry","Handbags","Streetwear","Vintage","Electronics",
  "Phones","Gaming","Instruments","Cameras","Wine","Whiskey","Furniture","Antiques",
  "Sports Memorabilia","Domain Names","Crypto","NFTs",
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function useCycling(len: number, ms = 2800) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(x => (x + 1) % len), ms);
    return () => clearInterval(t);
  }, [len, ms]);
  return i;
}

function AnimatedNumber({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let v = 0;
    const step = target / 45;
    const t = setInterval(() => {
      v += step;
      if (v >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(v));
    }, 28);
    return () => clearInterval(t);
  }, [target]);
  return <>{val >= 1_000_000 ? "10M+" : val.toLocaleString()}</>;
}

function SparkLine({ up }: { up: boolean }) {
  const pts = up
    ? "0,30 12,24 25,27 38,16 50,19 62,10 75,13 88,6 100,2"
    : "0,2  12,6  25,4  38,12 50,9  62,18 75,14 88,24 100,30";
  return (
    <svg width="90" height="34" viewBox="0 0 100 32">
      <polyline
        points={pts}
        stroke={up ? "#22c55e" : "#ef4444"}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendCard({ item, price, change, up }: { item: string; price: string; change: string; up: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${hov ? (up ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)") : "rgba(255,255,255,0.06)"}`,
        padding: "16px 18px",
        transition: "border-color 0.3s",
        cursor: "default",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>{item}</span>
        <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: up ? "#22c55e" : "#ef4444", fontWeight: 600 }}>{change}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <span style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 26, color: "white" }}>{price}</span>
        <SparkLine up={up} />
      </div>
    </div>
  );
}

function PriceFeed() {
  const idx = useCycling(LIVE_PRICES.length, 2600);
  const [shown, setShown] = useState(0);
  const [fade, setFade] = useState(true);
  useEffect(() => {
    setFade(false);
    const t = setTimeout(() => { setShown(idx); setFade(true); }, 220);
    return () => clearTimeout(t);
  }, [idx]);
  const p = LIVE_PRICES[shown];
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderLeft: `2px solid ${p.up ? "#22c55e" : "#ef4444"}`,
      padding: "14px 18px",
      opacity: fade ? 1 : 0,
      transition: "opacity 0.22s",
    }}>
      <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 6 }}>
        LIVE · FLIP PRICE
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", lineHeight: 1.35 }}>{p.item}</div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 26, color: "white", lineHeight: 1 }}>{p.price}</div>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: p.up ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
            {p.up ? "▲" : "▼"} {p.change}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [showCompliance, setShowCompliance] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);

  const howRef     = useRef<HTMLDivElement>(null);
  const marketsRef = useRef<HTMLDivElement>(null);
  const aboutRef   = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/feed");
    });
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: "success", text: "Verification link sent to your email." });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const { data: profile } = await supabase
          .from("profiles")
          .select("kyc_status")
          .eq("id", data.user.id)
          .single();

        if (profile?.kyc_status === "verified") {
          router.push("/feed");
        } else {
          setActiveUserId(data.user.id);
          setShowCompliance(true);
        }
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const tickerStr  = TICKER_ITEMS.map(t => `  ${t.label}  ${t.up ? "▲" : "▼"} ${t.val}  ·`).join("  ");
  const tickerFull = tickerStr + "  " + tickerStr;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#080808", color: "white", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;0,900;1,900&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes tickerL   { from{transform:translateX(0)}     to{transform:translateX(-50%)} }
        @keyframes tickerR   { from{transform:translateX(-50%)}  to{transform:translateX(0)}    }
        @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes scanline  { 0%{top:-4px} 100%{top:100%} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        .ticker-l  { display:inline-block; white-space:nowrap; animation:tickerL 38s linear infinite; }
        .ticker-r  { display:inline-block; white-space:nowrap; animation:tickerR 52s linear infinite; }
        .pulse     { animation:pulse 2s ease-in-out infinite; }
        .spin      { animation:spin 1s linear infinite; }
        .nav-link  { font-family:'DM Mono',monospace; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:rgba(255,255,255,0.35); cursor:pointer; transition:color 0.2s; text-decoration:none; background:none; border:none; padding:0; }
        .nav-link:hover { color:#e8ff47; }
        .cat-pill  { display:inline-block; font-family:'DM Mono',monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; padding:8px 16px; border:1px solid rgba(255,255,255,0.09); color:rgba(255,255,255,0.3); transition:all 0.25s; cursor:default; margin:4px; }
        .cat-pill:hover { border-color:#3b82f6; color:#3b82f6; background:rgba(59,130,246,0.05); }
        .step-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); padding:32px; position:relative; overflow:hidden; transition:background 0.3s,border-color 0.3s; }
        .step-card::after { content:''; position:absolute; bottom:0; left:0; width:0; height:2px; background:#3b82f6; transition:width 0.4s; }
        .step-card:hover { background:rgba(59,130,246,0.04); border-color:rgba(59,130,246,0.2); }
        .step-card:hover::after { width:100%; }
        .stat-block { background:#080808; padding:20px 24px; position:relative; overflow:hidden; transition:background 0.3s; cursor:default; }
        .stat-block:hover { background:rgba(59,130,246,0.06); }
        .stat-ul   { position:absolute; bottom:0; left:0; height:2px; width:0; background:#e8ff47; transition:width 0.35s; }
        .stat-block:hover .stat-ul { width:100%; }
        .feat-row  { display:flex; align-items:flex-start; gap:20px; transition:transform 0.2s; }
        .feat-row:hover { transform:translateX(5px); }
        .feat-icon { padding:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:12px; flex-shrink:0; transition:border-color 0.3s; }
        .submit-btn { width:100%; padding:16px; background:black; color:white; border:none; border-radius:16px; font-family:'DM Sans',sans-serif; font-weight:900; font-size:12px; letter-spacing:0.2em; text-transform:uppercase; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 20px 40px rgba(0,0,0,0.12); transition:background 0.2s,transform 0.15s,box-shadow 0.2s; }
        .submit-btn:hover:not(:disabled) { background:#1a1a1a; transform:translateY(-1px); box-shadow:0 28px 48px rgba(0,0,0,0.2); }
        .submit-btn:active { transform:translateY(0); }
        .chevron   { transition:transform 0.2s; }
        .submit-btn:hover .chevron { transform:translateX(4px); }
        .footer-link { font-family:'DM Mono',monospace; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:rgba(255,255,255,0.2); text-decoration:none; transition:color 0.2s; }
        .footer-link:hover { color:#e8ff47; }
        .trust-icon { display:flex; align-items:center; gap:5px; color:#9ca3af; }
        .scanline-wrap { position:absolute; top:0; left:0; right:0; bottom:0; overflow:hidden; pointer-events:none; }
        .scanline-bar  { position:absolute; left:0; right:0; height:3px; background:linear-gradient(90deg,transparent,rgba(59,130,246,0.25),transparent); animation:scanline 5s linear infinite; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 56px",
        background: "rgba(8,8,8,0.9)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <img src="/logo.png" alt="Flip" style={{ height: 28, filter: "brightness(0) invert(1)", objectFit: "contain" }} />

        <div style={{ display: "flex", gap: 40 }}>
          <button className="nav-link" onClick={() => scrollTo(howRef)}>How It Works</button>
          <button className="nav-link" onClick={() => scrollTo(marketsRef)}>Markets</button>
          <button className="nav-link" onClick={() => scrollTo(aboutRef)}>About</button>
        </div>

        <button
          onClick={() => document.getElementById("auth-panel")?.scrollIntoView({ behavior: "smooth" })}
          style={{ background: "#e8ff47", color: "#080808", border: "none", padding: "10px 26px", fontFamily: "DM Mono, monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", transition: "opacity 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.82")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          Get Early Access
        </button>
      </nav>

      {/* ── HERO / AUTH SPLIT ── */}
      <div style={{ display: "flex", minHeight: "100vh", paddingTop: 60 }}>

        {/* LEFT */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end",
          padding: "60px 56px 80px", position: "relative", overflow: "hidden",
          background: "radial-gradient(ellipse 80% 60% at 20% 40%, rgba(30,58,138,0.16) 0%, transparent 70%), #080808",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div className="scanline-wrap"><div className="scanline-bar" /></div>

          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.022, backgroundImage: "linear-gradient(rgba(59,130,246,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.5) 1px,transparent 1px)", backgroundSize: "80px 80px" }} />
          <div style={{ position: "absolute", top: "25%", left: "15%", width: 500, height: 500, background: "radial-gradient(circle,rgba(59,130,246,0.07) 0%,transparent 70%)", pointerEvents: "none" }} />

          {/* Logo + tagline */}
          <div style={{ position: "relative", zIndex: 2, marginBottom: 44 }}>
            <img
              src="/logo.png"
              alt="Flip"
              style={{ width: "min(560px, 70%)", height: "auto", objectFit: "contain", filter: "brightness(0) invert(1)" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
              <div style={{ height: 2, width: 28, background: "#e8ff47", flexShrink: 0 }} />
              <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "clamp(22px,3vw,46px)", color: "#e8ff47", letterSpacing: "0.04em" }}>
                Every Thing Has a Price.
              </div>
            </div>
          </div>

          {/* Live feed */}
          <div style={{ position: "relative", zIndex: 2, marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span className="pulse" style={{ width: 7, height: 7, background: "#22c55e", borderRadius: "50%", display: "inline-block" }} />
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)" }}>Live Market Feed</span>
            </div>
            <PriceFeed />
          </div>

          {/* Stats */}
          <div style={{ position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 36 }}>
            {[
              { label: "Items Tracked", node: <AnimatedNumber target={3_000_000_000} /> },
              { label: "Categories",    node: <AnimatedNumber target={142} /> },
              { label: "Price Updates", node: "Real Time" },
            ].map(({ label, node }) => (
              <div key={label} className="stat-block">
                <div className="stat-ul" />
                <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 38, color: "#e8ff47", lineHeight: 1 }}>{node}</div>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Features */}
          <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 26, marginBottom: 36 }}>
            {[
              { icon: <Zap size={21} />,      color: "#3b82f6", hb: "rgba(96,165,250,0.5)",  title: "Instant Valuation", desc: "Real-time market pricing via Oracle v3 global data stream." },
              { icon: <Shield size={21} />,    color: "#22c55e", hb: "rgba(74,222,128,0.5)",  title: "Vault Security",    desc: "Military-grade tracking for high-value inventory." },
              { icon: <BarChart3 size={21} />, color: "#a855f7", hb: "rgba(192,132,252,0.5)", title: "Market Oracle",     desc: "Live volatility alerts and global price indices." },
            ].map(({ icon, color, hb, title, desc }) => (
              <div
                key={title}
                className="feat-row"
                onMouseEnter={e => (e.currentTarget.querySelector<HTMLElement>(".feat-icon")!.style.borderColor = hb)}
                onMouseLeave={e => (e.currentTarget.querySelector<HTMLElement>(".feat-icon")!.style.borderColor = "rgba(255,255,255,0.1)")}
              >
                <div className="feat-icon" style={{ color }}>{icon}</div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.3em", textTransform: "uppercase" }}>{title}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", marginTop: 4, lineHeight: 1.65, fontWeight: 300 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Status */}
          <div style={{ position: "relative", zIndex: 2, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 18, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="pulse" style={{ width: 6, height: 6, background: "#22c55e", borderRadius: "50%", display: "inline-block" }} />
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: "0.38em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", fontWeight: 700 }}>
              Node_Status: Online // Protocol_v1.1
            </span>
          </div>
        </div>

        {/* RIGHT – Auth form */}
        <div
          id="auth-panel"
          style={{ width: "min(500px, 44vw)", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 52px", background: "white", color: "black", borderRadius: "40px 0 0 40px", position: "relative", overflow: "hidden" }}
        >
          <div style={{ position: "absolute", bottom: -24, right: -16, fontFamily: "Bebas Neue, sans-serif", fontSize: 190, color: "rgba(0,0,0,0.028)", lineHeight: 1, pointerEvents: "none", userSelect: "none", transition: "all 0.4s" }}>
            {isSignUp ? "02" : "01"}
          </div>

          <div style={{ width: "100%", position: "relative", zIndex: 1 }}>
            {/* Step indicator */}
            <div style={{ marginBottom: 30 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {[false, true].map((_, i) => (
                    <div key={i} style={{ width: 24, height: 3, borderRadius: 99, background: (i === 0 && !isSignUp) || (i === 1 && isSignUp) ? "black" : "#e5e7eb", transition: "background 0.35s" }} />
                  ))}
                </div>
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: "#9ca3af" }}>
                  {isSignUp ? "Step 02 — Register" : "Step 01 — Authenticate"}
                </span>
              </div>
              <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 44, letterSpacing: "0.02em", lineHeight: 1, fontStyle: "italic", margin: 0 }}>
                {isSignUp ? "Initialize Vault" : "Terminal Access"}
              </h2>
              <p style={{ color: "#6b7280", fontSize: 13, marginTop: 8, fontWeight: 500 }}>
                {isSignUp ? "Create your credentials to begin" : "Enter your access keys below"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleAuth}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
                {[
                  { label: "Identifier / Email",   type: "email",    ph: "name@terminal.com", val: email,    set: setEmail,    focused: emailFocus, setFocused: setEmailFocus },
                  { label: "Access Key / Password", type: "password", ph: "••••••••",          val: password, set: setPassword, focused: passFocus,  setFocused: setPassFocus  },
                ].map(({ label, type, ph, val, set, focused, setFocused }) => (
                  <div key={label}>
                    <label style={{ display: "block", fontFamily: "DM Mono, monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: focused ? "#111" : "#9ca3af", marginBottom: 7, transition: "color 0.2s" }}>
                      {label}
                    </label>
                    <input
                      type={type}
                      required
                      minLength={type === "password" ? 6 : undefined}
                      placeholder={ph}
                      value={val}
                      onChange={e => set(e.target.value)}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      style={{ width: "100%", padding: "15px 16px", background: focused ? "white" : "#f9fafb", border: `1px solid ${focused ? "#111" : "#e5e7eb"}`, borderRadius: 16, outline: "none", fontSize: 14, fontFamily: "DM Sans, sans-serif", transition: "border-color 0.2s,background 0.2s,box-shadow 0.2s", boxShadow: focused ? "0 0 0 3px rgba(0,0,0,0.06)" : "none" }}
                    />
                  </div>
                ))}
              </div>

              {message && (
                <div style={{ padding: "13px 16px", borderRadius: 14, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center", marginBottom: 14, background: message.type === "error" ? "#fef2f2" : "#f0fdf4", color: message.type === "error" ? "#dc2626" : "#16a34a" }}>
                  {message.text}
                </div>
              )}

              <button type="submit" className="submit-btn" disabled={loading} style={{ opacity: loading ? 0.72 : 1 }}>
                {loading
                  ? <Loader2 size={20} className="spin" />
                  : <>{isSignUp ? "Establish Connection" : "Authorize Access"}<ChevronRight size={16} className="chevron" /></>
                }
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: 18 }}>
              <button
                onClick={() => { setIsSignUp(s => !s); setMessage(null); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9ca3af", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "black")}
                onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
              >
                {isSignUp ? "Existing Agent? Log in" : "New Operator? Request Access"}
              </button>
            </div>

            {/* Trust row */}
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 14, flexWrap: "wrap" }}>
                {[
                  { icon: <Shield size={13} />,   l: "Bank-Grade Security" },
                  { icon: <Zap size={13} />,       l: "Instant Pricing"     },
                  { icon: <Activity size={13} />,  l: "Always Live"         },
                ].map(({ icon, l }) => (
                  <div key={l} className="trust-icon">
                    {icon}
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>{l}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span className="pulse" style={{ width: 6, height: 6, background: "#22c55e", borderRadius: "50%", display: "inline-block" }} />
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#d1d5db", fontWeight: 700 }}>Secure Connection Established</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DUAL TICKERS ── */}
      <div style={{ background: "#0c0c0c", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" }}>
        {[{ cls: "ticker-l", op: 0.13 }, { cls: "ticker-r", op: 0.07 }].map(({ cls, op }, i) => (
          <div key={i} style={{ overflow: "hidden", padding: "9px 0", borderBottom: i === 0 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
            <span className={cls} style={{ fontFamily: "DM Mono, monospace", fontSize: 11, letterSpacing: "0.14em", color: `rgba(255,255,255,${op})` }}>
              {tickerFull}&nbsp;&nbsp;{tickerFull}
            </span>
          </div>
        ))}
      </div>

      {/* ── HOW IT WORKS ── */}
      <div ref={howRef} style={{ padding: "100px 80px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e8ff47", marginBottom: 14 }}>Process</div>
        <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "clamp(52px,7vw,96px)", lineHeight: 0.95, marginBottom: 52 }}>How Flip<br />Works.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { n: "01", t: "Aggregate", b: "We pull listings, sales, and signals from every marketplace, forum, and platform on the internet in real time." },
            { n: "02", t: "Normalize",  b: "AI cleans every data point accounting for condition, region, demand cycles, and liquidity depth." },
            { n: "03", t: "Price",      b: "A live Flip Price is generated high, low, average, and trend. One number that clears the market for anything." },
            { n: "04", t: "Trade",      b: "Buy, sell, or match locally at the Flip Price. Every object becomes a tradeable asset with market transparency." },
          ].map(({ n, t, b }, i) => (
            <div key={n} className="step-card">
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, letterSpacing: "0.2em", color: "#e8ff47", marginBottom: 14 }}>{n} —</div>
              <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 24, letterSpacing: "0.06em", marginBottom: 10 }}>{t}</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.38)", fontWeight: 300 }}>{b}</div>
              {i < 3 && <div style={{ position: "absolute", top: 32, right: -6, fontFamily: "DM Mono, monospace", fontSize: 14, color: "#3b82f6", zIndex: 1 }}>→</div>}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginTop: 40 }}>
          {LIVE_PRICES.slice(0, 4).map(p => (
            <TrendCard key={p.item} item={p.item.split(" ").slice(0, 3).join(" ")} price={p.price} change={p.change} up={p.up} />
          ))}
        </div>
      </div>

      {/* ── MARKETS ── */}
      <div ref={marketsRef} style={{ padding: "100px 80px", background: "#0c0c0c", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e8ff47", marginBottom: 14 }}>Markets</div>
        <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "clamp(52px,7vw,96px)", lineHeight: 0.95, marginBottom: 44 }}>Everything.<br />Priced.</div>
        <div>{CATEGORIES.map(c => <span key={c} className="cat-pill">{c}</span>)}</div>
      </div>

      {/* ── ABOUT ── */}
      <div ref={aboutRef} style={{ padding: "100px 80px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e8ff47", marginBottom: 14 }}>About</div>
            <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "clamp(48px,6vw,80px)", lineHeight: 0.95, marginBottom: 24 }}>The Flip<br />Price.</div>
            <p style={{ fontSize: 15, lineHeight: 1.85, color: "rgba(255,255,255,0.48)", marginBottom: 16, fontWeight: 300 }}>
              Flip aggregates listings, transactions, and market signals across the entire internet then applies AI to normalize for condition, demand, and liquidity.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.85, color: "rgba(255,255,255,0.48)", fontWeight: 300 }}>
              The result: a single, real-time <strong style={{ color: "white", fontWeight: 600 }}>Flip Price</strong> for anything. High. Low. Average. Trend. One number that clears the market.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {LIVE_PRICES.slice(4).map(p => (
              <TrendCard key={p.item} item={p.item.split(" ").slice(0, 3).join(" ")} price={p.price} change={p.change} up={p.up} />
            ))}
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ padding: "32px 80px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <img src="/logo.png" alt="Flip" style={{ height: 22, filter: "brightness(0) invert(1)", opacity: 0.3, objectFit: "contain" }} />

        <div style={{ display: "flex", gap: 28 }}>
          {[
            { label: "Privacy", href: "/privacy" },
            { label: "Terms",   href: "/terms"   },
            { label: "Press",   href: "/press"   },
            { label: "Contact", href: "/contact" },
          ].map(({ label, href }) => (
            <Link key={label} href={href} className="footer-link">{label}</Link>
          ))}
        </div>

        <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: "0.1em", color: "rgba(255,255,255,0.15)" }}>
          © 2025 Flip. All rights reserved.
        </div>
      </footer>

      {/* ── COMPLIANCE MODAL ── */}
      {showCompliance && activeUserId && (
        <ComplianceModal userId={activeUserId} onComplete={() => router.push("/feed")} />
      )}
    </div>
  );
}