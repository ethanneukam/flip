import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { Shield, Zap, BarChart3, Activity } from "lucide-react";

// ─── Static data ──────────────────────────────────────────────────────────────

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

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AuthPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const howRef     = useRef<HTMLDivElement>(null);
  const marketsRef = useRef<HTMLDivElement>(null);
  const aboutRef   = useRef<HTMLDivElement>(null);
  const benchmarkRef = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleTerminalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Infinite free searches - Direct to the chart/terminal feed
    router.push(`/terminal?q=${encodeURIComponent(searchQuery)}`);
  };

  const tickerStr  = TICKER_ITEMS.map(t => `  ${t.label}  ${t.up ? "▲" : "▼"} ${t.val}  ·`).join("  ");
  const tickerFull = tickerStr + "  " + tickerStr;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#080808", color: "white", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;0,900;1,900&family=DM+Mono:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes tickerL   { from{transform:translateX(0)}     to{transform:translateX(-50%)} }
        @keyframes tickerR   { from{transform:translateX(-50%)}  to{transform:translateX(0)}    }
        @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes scanline  { 0%{top:-4px} 100%{top:100%} }
        .ticker-l  { display:inline-block; white-space:nowrap; animation:tickerL 38s linear infinite; }
        .ticker-r  { display:inline-block; white-space:nowrap; animation:tickerR 52s linear infinite; }
        .pulse     { animation:pulse 2s ease-in-out infinite; }
        .nav-link  { font-family:'DM Mono',monospace; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:rgba(255,255,255,0.35); cursor:pointer; transition:color 0.2s; text-decoration:none; background:none; border:none; padding:0; }
        .nav-link:hover { color:#e8ff47; }
        .cat-pill  { display:inline-block; font-family:'DM Mono',monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; padding:8px 16px; border:1px solid rgba(255,255,255,0.09); color:rgba(255,255,255,0.3); transition:all 0.25s; cursor:default; margin:4px; }
        .cat-pill:hover { border-color:#e8ff47; color:#e8ff47; background:rgba(232,255,71,0.05); }
        .step-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); padding:32px; position:relative; overflow:hidden; transition:background 0.3s,border-color 0.3s; }
        .step-card::after { content:''; position:absolute; bottom:0; left:0; width:0; height:2px; background:#e8ff47; transition:width 0.4s; }
        .step-card:hover { background:rgba(232,255,71,0.04); border-color:rgba(232,255,71,0.2); }
        .step-card:hover::after { width:100%; }
        .stat-block { background:#080808; padding:20px 24px; position:relative; overflow:hidden; transition:background 0.3s; cursor:default; border-right: 1px solid rgba(255,255,255,0.06); }
        .stat-block:last-child { border-right: none; }
        .stat-block:hover { background:rgba(232,255,71,0.03); }
        .stat-ul   { position:absolute; bottom:0; left:0; height:2px; width:0; background:#e8ff47; transition:width 0.35s; }
        .stat-block:hover .stat-ul { width:100%; }
        .terminal-input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 56px",
        background: "rgba(8,8,8,0.9)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <img src="/logo.png" alt="Flip Terminal" style={{ height: 28, filter: "brightness(0) invert(1)", objectFit: "contain" }} />

        <div style={{ display: "flex", gap: 40 }}>
          <button className="nav-link" onClick={() => scrollTo(benchmarkRef)}>Benchmarks</button>
          <button className="nav-link" onClick={() => scrollTo(howRef)}>Protocol</button>
          <button className="nav-link" onClick={() => scrollTo(marketsRef)}>Coverage</button>
          <button className="nav-link" onClick={() => scrollTo(aboutRef)}>About</button>
        </div>

        <button
          onClick={() => searchInputRef.current?.focus()}
          style={{ background: "#e8ff47", color: "#080808", border: "none", padding: "10px 26px", fontFamily: "DM Mono, monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", transition: "opacity 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.82")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          Initialize Search
        </button>
      </nav>

      {/* ── HERO / TERMINAL SEARCH ── */}
      <div style={{ 
        minHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "0 20px", position: "relative", overflow: "hidden",
        background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(232,255,71,0.03) 0%, transparent 70%), #080808"
      }}>
        {/* Background Grid Accent */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.02, backgroundImage: "linear-gradient(rgba(232,255,71,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(232,255,71,0.5) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

        <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "800px", textAlign: "center" }}>
          
          <img src="/logo.png" alt="Flip" style={{ width: "min(400px, 80%)", height: "auto", objectFit: "contain", filter: "brightness(0) invert(1)", margin: "0 auto 20px auto" }} />
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 48 }}>
            <div style={{ height: 1, width: 30, background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
            <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "clamp(22px,3vw,32px)", color: "#e8ff47", letterSpacing: "0.08em" }}>
              EVERY THING HAS A PRICE.
            </div>
            <div style={{ height: 1, width: 30, background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
          </div>

          <form onSubmit={handleTerminalSearch} style={{ position: "relative", width: "100%", marginBottom: 60 }}>
            <span style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", fontFamily: "DM Mono, monospace", color: "#e8ff47", fontSize: 20 }}>$</span>
            <input 
              ref={searchInputRef}
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="terminal-input"
              placeholder="SEARCH_ASSET_DNA..."
              style={{
                width: "100%",
                padding: "26px 26px 26px 50px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "4px",
                color: "white",
                fontFamily: "DM Mono, monospace",
                fontSize: "18px",
                outline: "none",
                boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                transition: "border-color 0.3s, background 0.3s"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(232,255,71,0.4)";
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.background = "rgba(255,255,255,0.02)";
              }}
            />
          </form>

          {/* Core Stats Block */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
            {[
              { label: "Items Tracked", node: <AnimatedNumber target={3_000_000_000} /> },
              { label: "Categories",    node: <AnimatedNumber target={142} /> },
              { label: "Price Updates", node: "Real Time" },
            ].map(({ label, node }) => (
              <div key={label} className="stat-block">
                <div className="stat-ul" />
                <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 38, color: "white", lineHeight: 1 }}>{node}</div>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

        </div>

        {/* Scroll Indicator */}
        <div style={{ position: "absolute", bottom: 40, opacity: 0.5 }} className="pulse">
           <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: "0.3em", color: "#e8ff47" }}>SYS_STATUS: ONLINE // SCROLL_DOWN</div>
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

      {/* ── PHASE 2: BENCHMARK ENGINE PLACEHOLDER ── */}
      <div ref={benchmarkRef} style={{ padding: "100px 80px", background: "#080808", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#e8ff47", letterSpacing: "0.2em", marginBottom: 16 }}>TERMINAL_ACCURACY_LOG</div>
          <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "clamp(52px,7vw,96px)", marginBottom: 40, lineHeight: 0.95 }}>FLIP VS THE WORLD.</h2>
          
          <div style={{ maxWidth: "1000px", margin: "0 auto", border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)", padding: "60px 40px" }}>
             <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "DM Mono, monospace", fontSize: 13, lineHeight: 2, textAlign: "left", maxWidth: "600px", margin: "0 auto" }}>
                <span style={{ color: "#e8ff47" }}>{`>`}</span> BENCHMARK_ENGINE_INITIALIZING... <br/>
                <span style={{ color: "#e8ff47" }}>{`>`}</span> COMPARING_GOOGLE_VISION_DATA_POINTS... <br/>
                <span style={{ color: "#e8ff47" }}>{`>`}</span> COMPARING_AMAZON_RETAIL_STAPLES... <br/>
                <span style={{ color: "#e8ff47" }}>{`>`}</span> AWAITING_LIVE_DATA_FEED
             </p>
             <div style={{ marginTop: 40, height: "150px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed rgba(255,255,255,0.1)" }}>
                <span style={{ opacity: 0.2, fontFamily: "DM Mono, monospace", fontSize: 12, letterSpacing: "0.1em" }}>[ LIVE_ACCURACY_CHART_PENDING_PHASE_2 ]</span>
             </div>
          </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div ref={howRef} style={{ padding: "100px 80px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e8ff47", marginBottom: 14 }}>Protocol</div>
        <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "clamp(52px,7vw,96px)", lineHeight: 0.95, marginBottom: 52 }}>How Terminal<br />Works.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { n: "01", t: "Aggregate", b: "We pull listings, sales, and signals from every marketplace, forum, and platform on the internet in real time." },
            { n: "02", t: "Normalize",  b: "AI cleans every data point accounting for condition, region, demand cycles, and liquidity depth." },
            { n: "03", t: "Price",      b: "A live Flip Price is generated high, low, average, and trend. One number that clears the market for anything." },
            { n: "04", t: "Monitor",    b: "Add assets to your Asset Monitor. Receive volatility alerts and track portfolio net worth instantly." },
          ].map(({ n, t, b }, i) => (
            <div key={n} className="step-card">
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, letterSpacing: "0.2em", color: "#e8ff47", marginBottom: 14 }}>{n} —</div>
              <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 24, letterSpacing: "0.06em", marginBottom: 10 }}>{t}</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.38)", fontWeight: 300 }}>{b}</div>
              {i < 3 && <div style={{ position: "absolute", top: 32, right: -6, fontFamily: "DM Mono, monospace", fontSize: 14, color: "rgba(255,255,255,0.1)", zIndex: 1 }}>→</div>}
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
        <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e8ff47", marginBottom: 14 }}>Coverage</div>
        <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "clamp(52px,7vw,96px)", lineHeight: 0.95, marginBottom: 44 }}>Everything.<br />Priced.</div>
        <div>{CATEGORIES.map(c => <span key={c} className="cat-pill">{c}</span>)}</div>
      </div>

      {/* ── ABOUT ── */}
      <div ref={aboutRef} style={{ padding: "100px 80px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e8ff47", marginBottom: 14 }}>About</div>
            <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "clamp(48px,6vw,80px)", lineHeight: 0.95, marginBottom: 24 }}>The Terminal<br />Standard.</div>
            <p style={{ fontSize: 15, lineHeight: 1.85, color: "rgba(255,255,255,0.48)", marginBottom: 16, fontWeight: 300 }}>
              Flip Terminal aggregates listings, transactions, and market signals across the entire internet then applies AI to normalize for condition, demand, and liquidity.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.85, color: "rgba(255,255,255,0.48)", fontWeight: 300 }}>
              The result: a single, real-time <strong style={{ color: "white", fontWeight: 600 }}>Flip Price</strong> for anything. High. Low. Average. Trend. One number that clears the market.
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: "40px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {[
                { icon: <Zap size={21} />,      color: "#e8ff47", title: "Instant Valuation", desc: "Real-time market pricing via Terminal v3 global data stream." },
                { icon: <Shield size={21} />,    color: "#22c55e", title: "Asset Monitor",    desc: "Military-grade tracking for high-value portfolio inventory." },
                { icon: <Activity size={21} />,  color: "#3b82f6", title: "Live Volatility",  desc: "Continuous price alerts and global liquidity depth indexing." },
              ].map(({ icon, color, title, desc }) => (
                <div key={title} style={{ display: "flex", gap: 20 }}>
                  <div style={{ color: color, padding: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", height: "fit-content" }}>{icon}</div>
                  <div>
                    <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>{title}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer style={{ padding: "40px 80px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)" }}>
           FLIP_TERMINAL // INFRASTRUCTURE_PROTOCOL_v3.0 // 2026
        </div>
      </footer>
    </div>
  );
}