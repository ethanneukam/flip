import Link from "next/link";
import { ChevronLeft, ShieldAlert, Scale, Globe } from "lucide-react";

export default function TermsOfService() {
  const lastUpdated = "JANUARY 31, 2026";

  return (
    <div className="min-h-screen bg-black text-zinc-400 font-mono p-6 md:p-12 selection:bg-blue-500/30">
      <div className="max-w-3xl mx-auto">
        {/* NAV */}
        <Link href="/auth" className="flex items-center gap-2 text-xs text-blue-400 mb-12 hover:text-blue-300 transition-colors">
          <ChevronLeft size={14} /> RETURN_TO_TERMINAL
        </Link>

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-8 mb-12">
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">Terms of Protocol</h1>
          <p className="text-[10px] tracking-[0.3em] opacity-50">DOCUMENT_ID: FLIP-TOS-V3.0 // LAST_UPDATED: {lastUpdated}</p>
        </header>

        {/* CONTENT */}
        <div className="space-y-12 text-sm leading-relaxed">
          
          <section>
            <h2 className="text-white font-bold uppercase flex items-center gap-2 mb-4 text-xs tracking-widest">
              <Globe size={14} className="text-blue-500" /> 01. Acceptance of Access
            </h2>
            <p>
              By initializing a connection to the FLIP Market Oracle ("The Service"), you acknowledge that you are an authorized operator. This is a legally binding agreement between you and the FLIP Protocol. Access is strictly granted to verified entities who have completed the identity verification process.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold uppercase flex items-center gap-2 mb-4 text-xs tracking-widest">
              <ShieldAlert size={14} className="text-red-500" /> 02. Data Accuracy Disclaimer
            </h2>
            <p className="bg-zinc-900/50 p-4 border-l-2 border-red-900 italic">
              "THE DATA IS PROVIDED 'AS IS'." 
              <br/><br/>
              Oracle streams are harvested from global secondary markets. FLIP does not guarantee 100% uptime or absolute price accuracy. Market fluctuations may occur faster than the refresh interval. You agree that FLIP is not liable for any financial decisions or "flips" made based on this data.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold uppercase flex items-center gap-2 mb-4 text-xs tracking-widest">
              <Scale size={14} className="text-green-500" /> 03. Prohibited Conduct
            </h2>
            <ul className="list-disc pl-5 space-y-2 opacity-80">
              <li>Reverse engineering the Scraping Engine or Brain logic.</li>
              <li>Unauthorized API calls to the <code className="bg-zinc-800 px-1 text-blue-300">/api/trigger-oracle</code> endpoint.</li>
              <li>Redistributing Oracle data to third-party marketplaces without an Enterprise API Key.</li>
              <li>Using automated "bots" to scrape the scraper.</li>
            </ul>
          </section>

          <section className="pb-20 border-t border-zinc-900 pt-8">
            <h2 className="text-[10px] text-white/20 uppercase tracking-[0.4em] mb-4">Termination_Clause</h2>
            <p className="text-xs opacity-40 italic">
              FLIP reserves the right to sever terminal access to any operator found in breach of Section 03. All logged IP addresses and identity data will be preserved for compliance audits.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
