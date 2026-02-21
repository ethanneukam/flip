import Link from "next/link";
import { ChevronLeft, RefreshCcw, AlertTriangle } from "lucide-react";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-black text-zinc-400 font-mono p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/charts" className="flex items-center gap-2 text-xs text-blue-400 mb-12 hover:text-blue-300 transition-colors">
          <ChevronLeft size={14} /> RETURN_TO_TERMINAL
        </Link>

        <header className="border-b border-zinc-800 pb-8 mb-12">
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">Refund Arbitration</h1>
          <p className="text-[10px] tracking-[0.3em] opacity-50">POLICY_ID: FLIP-REFUND-001</p>
        </header>

        <div className="space-y-12 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-bold uppercase flex items-center gap-2 mb-4 text-xs tracking-widest">
              <AlertTriangle size={14} className="text-orange-500" /> 01. Finality of Digital Access
            </h2>
            <p>
              Due to the high-frequency nature of the FLIP Oracle data, all subscription payments are generally **non-refundable**. Once data access is granted, the "value" has been delivered.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold uppercase flex items-center gap-2 mb-4 text-xs tracking-widest">
              <RefreshCcw size={14} className="text-blue-500" /> 02. Cancellation
            </h2>
            <p>
              You may terminate your subscription at any time via the "Settings" terminal. You will retain access until the end of your current billing cycle. No partial refunds will be issued for unused days.
            </p>
          </section>

          <section className="pb-20 border-t border-zinc-900 pt-8">
            <h2 className="text-[10px] text-white/20 uppercase tracking-[0.4em] mb-4">Exception_Clause</h2>
            <p className="text-xs opacity-40 italic">
              In cases of verified technical system failure (Oracle downtime {`>`} 48 hours), operators may contact support for manual arbitration.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
