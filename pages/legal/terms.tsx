import Link from "next/link";
import { ChevronLeft, ShieldAlert, Scale, Globe, CreditCard, Zap } from "lucide-react";

export default function TermsOfService() {
  const lastUpdated = "FEBRUARY 21, 2026";

  return (
    <div className="min-h-screen bg-black text-zinc-400 font-mono p-6 md:p-12 selection:bg-blue-500/30">
      <div className="max-w-3xl mx-auto">
        <Link href="/charts" className="flex items-center gap-2 text-xs text-blue-400 mb-12 hover:text-blue-300 transition-colors">
          <ChevronLeft size={14} /> RETURN_TO_TERMINAL
        </Link>

        <header className="border-b border-zinc-800 pb-8 mb-12">
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">Terms of Protocol</h1>
          <p className="text-[10px] tracking-[0.3em] opacity-50">DOCUMENT_ID: FLIP-TOS-V3.0 // STATUS: ACTIVE</p>
        </header>

        <div className="space-y-12 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-bold uppercase flex items-center gap-2 mb-4 text-xs tracking-widest">
              <Globe size={14} className="text-blue-500" /> 01. Acceptance of Access
            </h2>
            <p>
              By initializing a connection to the FLIP Market Oracle ("The Service"), you acknowledge that you are an authorized operator. Access is strictly granted to verified entities. You agree to be bound by these protocols.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold uppercase flex items-center gap-2 mb-4 text-xs tracking-widest">
              <CreditCard size={14} className="text-purple-500" /> 02. Subscription & Billing
            </h2>
            <p>
              Access to Premium Oracle Streams requires an active subscription. Payments are processed via Stripe. You authorize FLIP to charge your provided payment method on a recurring basis. Failure to maintain a valid payment method will result in immediate terminal disconnect.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold uppercase flex items-center gap-2 mb-4 text-xs tracking-widest">
              <ShieldAlert size={14} className="text-red-500" /> 03. Data Accuracy Disclaimer
            </h2>
            <p className="bg-zinc-900/50 p-4 border-l-2 border-red-900 italic">
              "THE DATA IS PROVIDED 'AS IS'." FLIP is a data aggregator. We do not provide financial advice. You acknowledge that "flips" carry inherent market risk. FLIP is not responsible for capital loss resulting from oracle data latency or inaccuracy.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold uppercase flex items-center gap-2 mb-4 text-xs tracking-widest">
              <Scale size={14} className="text-green-500" /> 04. Prohibited Conduct
            </h2>
            <ul className="list-disc pl-5 space-y-2 opacity-80">
              <li>Reverse engineering the Brain logic or Scraping Engine.</li>
              <li>Unauthorized redistribtion of Oracle data.</li>
              <li>Attempting to bypass Stripe paywalls or "checkout session" protocols.</li>
            </ul>
          </section>

          <section className="pb-20 border-t border-zinc-900 pt-8">
            <h2 className="text-[10px] text-white/20 uppercase tracking-[0.4em] mb-4">Liability_Limit</h2>
            <p className="text-xs opacity-40 italic">
              To the maximum extent permitted by law, FLIP Protocol's total liability shall not exceed the amount paid by the operator in the last 30 days of service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
