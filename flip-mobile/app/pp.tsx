import Link from "next/link";
import { ChevronLeft, Database, Eye, Lock } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-zinc-400 font-mono p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/charts" className="flex items-center gap-2 text-xs text-blue-400 mb-12 hover:text-blue-300 transition-colors">
          <ChevronLeft size={14} /> RETURN_TO_TERMINAL
        </Link>

        <header className="border-b border-zinc-800 pb-8 mb-12">
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">Privacy Encryption</h1>
          <p className="text-[10px] tracking-[0.3em] opacity-50">ENCRYPTION_LEVEL: AES-256 // PROTOCOL: FLIP-PRIVACY-V1</p>
        </header>

        <div className="space-y-12 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-bold uppercase flex items-center gap-2 mb-4 text-xs tracking-widest">
              <Database size={14} className="text-blue-500" /> 01. Data Collection
            </h2>
            <p>
              We collect operator identifiers (Email, Username) via Supabase Auth. We do not store raw credit card data; all financial transmissions are handled via Stripe's encrypted vaults.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold uppercase flex items-center gap-2 mb-4 text-xs tracking-widest">
              <Eye size={14} className="text-yellow-500" /> 02. Usage Logs
            </h2>
            <p>
              To optimize oracle speed, we log IP addresses, browser types, and "item interest" (which charts you view). This data is used strictly for terminal performance and security audits.
            </p>
          </section>

          <section className="pb-20 border-t border-zinc-900 pt-8">
            <h2 className="text-[10px] text-white/20 uppercase tracking-[0.4em] mb-4">Cookie_Protocol</h2>
            <p className="text-xs opacity-40 italic">
              We use essential cookies to maintain your session. No third-party tracking "bots" are permitted within the terminal.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
