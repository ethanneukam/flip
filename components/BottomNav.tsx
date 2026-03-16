import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  LineChart, 
  Camera, 
  Lock 
} from 'lucide-react';

export default function BottomNav() {
  const router = useRouter();
  const isActive = (path: string) => router.pathname === path;

  const navItemClass = (path: string) => `
    flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200
    ${isActive(path) ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'}
  `;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-md border-t border-white/10 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between h-16 px-6 max-w-md mx-auto">
        
        {/* TERMINAL (Oracle + Pulse) */}
        <Link href="/chartsl" className={navItemClass('/charts')}>
          <LineChart 
            size={24} 
            className={isActive('/charts') ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : ''} 
            strokeWidth={isActive('/charts') ? 2.5 : 2}
          />
          <span className="text-[9px] font-black uppercase tracking-widest">Terminal</span>
        </Link>

        {/* SCAN (AI Vision) - The Hero Action */}
        <div className="flex justify-center -translate-y-4">
            <button 
              onClick={() => {
                // If on terminal, trigger the scanner state
                // If elsewhere, route to terminal and then trigger scanner
                router.push('/charts?scan=true');
              }}
              className="bg-blue-600 rounded-2xl p-4 shadow-[0_0_25px_rgba(37,99,235,0.4)] transform active:scale-90 transition-all border-4 border-[#0A0A0A]"
            >
              <Camera size={28} className="text-white" strokeWidth={2.5} />
            </button>
        </div>

        {/* VAULT (Gated Portfolio) */}
        <Link href="/vault" className={navItemClass('/vault')}>
          <Lock 
            size={24} 
            className={isActive('/vault') ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : ''} 
            strokeWidth={isActive('/vault') ? 2.5 : 2}
          />
          <span className="text-[9px] font-black uppercase tracking-widest">Watchlist</span>
        </Link>

      </div>
    </nav>
  );
}