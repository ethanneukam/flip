import React from 'react';
import Link from 'next/link';
import { Terminal, Key, Globe, ArrowLeft, Code2, ShieldAlert } from 'lucide-react';


export default function APIDocumentation() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono selection:bg-[#e8ff47] selection:text-black">
     
      {/* Top Navigation Bar */}
      <nav className="border-b border-white/10 p-4 sticky top-0 bg-[#050505]/90 backdrop-blur-md z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-[#e8ff47] transition-colors">
            <ArrowLeft size={16} />
            <span className="text-[10px] uppercase tracking-widest font-bold">Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Terminal className="text-[#e8ff47]" size={20} />
            <span className="text-sm font-black italic tracking-tighter">TERMINAL_API_v1</span>
          </div>
        </div>
      </nav>


      {/* Main Content Split: Left (Docs) / Right (Code) */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-8 p-4 md:p-8">
       
        {/* LEFT COLUMN: EXPLANATIONS */}
        <div className="space-y-16 lg:pr-8 py-8">
         
          {/* Introduction */}
          <section className="space-y-4">
            <h1 className="text-4xl font-black tracking-tighter">API Reference</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              The Flip Terminal API is organized around REST. Our API has predictable resource-oriented URLs, returns JSON-encoded responses, and uses standard HTTP response codes.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-gray-400 uppercase tracking-widest">
              <Globe size={12} className="text-blue-500" />
              Base URL: <span className="text-white font-bold">https://flip-black-two.vercel.app/api/v1/price</span>
            </div>
          </section>


          {/* Authentication */}
          <section className="space-y-4 border-t border-white/10 pt-12">
            <h2 className="text-2xl font-black flex items-center gap-2">
              <Key className="text-[#e8ff47]" size={24} /> Authentication
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              The API uses API keys to authenticate requests. You can view and manage your API keys in the Terminal Dashboard.
            </p>
            <p className="text-sm text-gray-400">
              Authentication is performed via the <code className="text-[#e8ff47] bg-white/5 px-1.5 py-0.5 rounded">X-API-KEY</code> HTTP header.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3 mt-4">
              <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-amber-200/80 leading-relaxed">
                Your API keys carry many privileges, so be sure to keep them secure. Do not share your secret API keys in publicly accessible areas such as GitHub, client-side code, and so forth.
              </p>
            </div>
          </section>


          {/* Endpoint: Get Price */}
          <section className="space-y-4 border-t border-white/10 pt-12">
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-[10px] font-black uppercase rounded tracking-widest border border-green-500/30">GET</span>
              <h2 className="text-xl font-bold">/v1/price/[card_name]</h2>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Retrieves the current market value and quantum oracle data for a specific trading asset.
            </p>


            <div className="space-y-2 mt-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-white/10 pb-2">Path Parameters</h3>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-sm font-bold text-white">card_name <span className="text-red-500">*</span></span>
                <span className="text-xs text-gray-500">string</span>
              </div>
              <p className="text-xs text-gray-400 pt-1">The name or slug of the asset (e.g., <code className="text-[#e8ff47]">Charizard-Base-Set</code>). Case-insensitive.</p>
            </div>
          </section>


          {/* Rate Limits */}
          <section className="space-y-4 border-t border-white/10 pt-12 pb-12">
            <h2 className="text-2xl font-black">Rate Limits</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              After your limit is reached you are billed for more calls depending on your plan
            </p>
            <ul className="space-y-2 text-sm text-gray-400 list-disc list-inside">
              <li><strong>Starter:</strong> 10,000 requests/month</li>
              <li><strong>Growth:</strong> 50,000 requests/month</li>
              <li><strong>Scale:</strong> 150,000 requests/month</li>
            </ul>
            <p className="text-xs text-gray-500 mt-4 italic">No real limit.</p>
          </section>


        </div>


        {/* RIGHT COLUMN: CODE EXAMPLES (Sticky on Desktop) */}
        <div className="lg:sticky lg:top-24 h-fit py-8 space-y-6">
         
          {/* Auth Example */}
          <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-[#1a1a1a] px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Code2 size={12} /> Request_Headers
              </span>
            </div>
            <pre className="p-6 text-xs text-gray-300 overflow-x-auto leading-loose">
              <code>
                <span className="text-blue-400">GET</span> /v1/price/Charizard-Base-Set HTTP/1.1{"\n"}
                Host: <span className="text-green-400">api.flip-terminal.com</span>{"\n"}
                <span className="text-purple-400">X-API-KEY</span>: <span className="text-[#e8ff47]">sk_live_your_api_key_here</span>
              </code>
            </pre>
          </div>


          {/* Response Example */}
          <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-[#1a1a1a] px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Code2 size={12} /> Response_Object (200 OK)
              </span>
            </div>
            <pre className="p-6 text-xs text-gray-300 overflow-x-auto leading-relaxed">
              <code>
                {"{"}{"\n"}
                {"  "}<span className="text-blue-400">"card"</span>: <span className="text-green-400">"Charizard Base Set"</span>,{"\n"}
                {"  "}<span className="text-blue-400">"flip-price"</span>: <span className="text-green-400">"$345.50"</span>,{"\n"}
                {"  "}<span className="text-blue-400">"currency"</span>: <span className="text-green-400">"USD"</span>,{"\n"}
                {"  "}<span className="text-blue-400">"last_updated"</span>: <span className="text-green-400">"2026-03-26T12:00:00.000Z"</span>,{"\n"}
                {"  "}<span className="text-blue-400">"status"</span>: <span className="text-green-400">"VERIFIED_TERMINAL_DATA"</span>,{"\n"}
                {"  "}<span className="text-blue-400">"provider"</span>: <span className="text-green-400">"Flip Terminal Oracle"</span>{"\n"}
                {"}"}
              </code>
            </pre>
          </div>


          {/* Error Example */}
          <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-[#1a1a1a] px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Code2 size={12} /> Error_Object (404 Not Found)
              </span>
            </div>
            <pre className="p-6 text-xs text-gray-300 overflow-x-auto leading-relaxed">
              <code>
                {"{"}{"\n"}
                {"  "}<span className="text-red-400">"error"</span>: <span className="text-green-400">"Asset not found in Terminal database"</span>,{"\n"}
                {"  "}<span className="text-red-400">"requested_card"</span>: <span className="text-green-400">"Fake-Card-123"</span>{"\n"}
                {"}"}
              </code>
            </pre>
          </div>


        </div>
      </div>
    </div>
  );
}