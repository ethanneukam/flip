import { useState } from 'react';
import Head from 'next/head';
import { Play, Database, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import BottomNav from '../components/BottomNav';

export default function AdminTerminal() {
  const [status, setStatus] = useState<'idle' | 'scraping' | 'success'>('idle');
  const [log, setLog] = useState<string[]>([]);

  const categories = [
    { name: 'Rolex Submariner', ticker: 'RLX-SUB' },
    { name: 'Jordan 1 Retro', ticker: 'AJ1' },
    { name: 'Patek Philippe Nautilus', ticker: 'PP-NAUT' },
    { name: 'Audemars Piguet Royal Oak', ticker: 'AP-RO' }
  ];

  const runMassScrape = async (category: string) => {
    setStatus('scraping');
    setLog(prev => [`[${new Date().toLocaleTimeString()}] Initializing ${category} sweep...`, ...prev]);

    try {
      const res = await fetch('/api/mass-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category })
      });
      
      const data = await res.json();
      setLog(prev => [`[SUCCESS] Ingested ${data.count || 0} assets for ${category}`, ...prev]);
      setStatus('success');
    } catch (err) {
      setLog(prev => [`[ERROR] Failed to scrape ${category}`, ...prev]);
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono pb-24">
      <Head><title>Admin Terminal | Flip Oracle</title></Head>
      
      <div className="p-6 border-b border-white/10 bg-black">
        <h1 className="text-red-500 font-black text-xs uppercase tracking-[0.3em]">Master_Control_v1.0</h1>
        <p className="text-[10px] text-gray-500 mt-1">DATA_INGESTION_OVERRIDE</p>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scrape Controls */}
        <div className="space-y-4">
          <h2 className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center">
            <Database size={12} className="mr-2" /> Global_Inbound_Nodes
          </h2>
          {categories.map((cat) => (
            <div key={cat.name} className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center">
              <div>
                <p className="text-sm font-bold">{cat.name}</p>
                <p className="text-[10px] text-gray-500">{cat.ticker}_SERIES</p>
              </div>
              <button 
                onClick={() => runMassScrape(cat.name)}
                disabled={status === 'scraping'}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 p-2 rounded-lg transition-all"
              >
                {status === 'scraping' ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
              </button>
            </div>
          ))}
        </div>

        {/* Live System Logs */}
        <div className="bg-black border border-white/10 rounded-xl p-4 h-[400px] flex flex-col">
          <p className="text-[10px] text-gray-500 font-bold mb-3 uppercase tracking-widest">System_Logs</p>
          <div className="flex-1 overflow-y-auto space-y-2">
            {log.length === 0 && <p className="text-[10px] text-gray-700">Waiting for command...</p>}
            {log.map((line, i) => (
              <p key={i} className={`text-[10px] ${line.includes('ERROR') ? 'text-red-400' : 'text-green-400'}`}>
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
