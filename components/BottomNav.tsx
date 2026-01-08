import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Activity, 
  LineChart, 
  PlusCircle, 
  Search, 
  Lock 
} from 'lucide-react';

export default function BottomNav() {
  const router = useRouter();
  
  const isActive = (path: string) => router.pathname === path;

  // Optimized styles for the Dark UI theme
  const navItemClass = (path: string) => `
    flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200
    ${isActive(path) ? 'text-white' : 'text-gray-500 hover:text-gray-300'}
  `;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] border-t border-white/10 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
        
        {/* PULSE (Feed) */}
        <Link href="/feed" className={navItemClass('/feed')}>
          <Activity 
            size={22} 
            className={isActive('/feed') ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''} 
            strokeWidth={isActive('/feed') ? 2.5 : 2}
          />
          <span className="text-[9px] font-black uppercase tracking-tighter">
            Pulse
          </span>
        </Link>

        {/* ORACLE (Charts) */}
        <Link href="/charts" className={navItemClass('/charts')}>
          <LineChart 
            size={22} 
            className={isActive('/charts') ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''} 
            strokeWidth={isActive('/charts') ? 2.5 : 2}
          />
          <span className="text-[9px] font-black uppercase tracking-tighter">
            Oracle
          </span>
        </Link>

        {/* ACTION: ADD ASSET */}
        <Link href="/add" className="flex flex-col items-center justify-center w-full h-full -translate-y-2">
          <div className="bg-white rounded-2xl p-3 shadow-[0_0_20px_rgba(255,255,255,0.2)] transform active:scale-90 transition-all">
            <PlusCircle size={28} className="text-black" strokeWidth={2.5} />
          </div>
        </Link>

        {/* LOOKUP (Search) */}
        <Link href="/search" className={navItemClass('/search')}>
          <Search 
            size={22} 
            className={isActive('/search') ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''} 
            strokeWidth={isActive('/search') ? 2.5 : 2}
          />
          <span className="text-[9px] font-black uppercase tracking-tighter">
            Lookup
          </span>
        </Link>

        {/* VAULT (Inventory) */}
        <Link href="/vault" className={navItemClass('/vault')}>
          <Lock 
            size={22} 
            className={isActive('/vault') ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''} 
            strokeWidth={isActive('/vault') ? 2.5 : 2}
          />
          <span className="text-[9px] font-black uppercase tracking-tighter">
            Vault
          </span>
        </Link>

      </div>
    </nav>
  );
}
