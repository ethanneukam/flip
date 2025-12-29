// components/layout/BottomNav.tsx
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Activity, // For Pulse (Feed)
  LineChart, // For Oracle (Charts)
  PlusCircle, // For Add Asset
  Search, // For Lookup
  Lock // For Vault (Private)
} from 'lucide-react';
import { PIVOT_CONFIG } from '../lib/pivot';

export default function BottomNav() {
  const router = useRouter();
  
  // Helper to determine active state
  const isActive = (path: string) => router.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        
        {/* PILLAR 3: PULSE (Formerly Feed) */}
        <Link href="/feed" className="flex flex-col items-center justify-center w-full h-full space-y-1">
          <Activity 
            size={24} 
            className={isActive('/feed') ? 'text-black' : 'text-gray-400'} 
            strokeWidth={isActive('/feed') ? 2.5 : 2}
          />
          <span className={`text-[10px] font-medium ${isActive('/feed') ? 'text-black' : 'text-gray-400'}`}>
            {PIVOT_CONFIG.semantics.feed}
          </span>
        </Link>

        {/* PILLAR 2: ORACLE (Formerly Charts) */}
        <Link href="/charts" className="flex flex-col items-center justify-center w-full h-full space-y-1">
          <LineChart 
            size={24} 
            className={isActive('/charts') ? 'text-black' : 'text-gray-400'} 
            strokeWidth={isActive('/charts') ? 2.5 : 2}
          />
          <span className={`text-[10px] font-medium ${isActive('/charts') ? 'text-black' : 'text-gray-400'}`}>
            {PIVOT_CONFIG.semantics.charts}
          </span>
        </Link>

        {/* ACTION: ADD ASSET (Central Hub) */}
        <Link href="/add" className="flex flex-col items-center justify-center w-full h-full">
          <div className="bg-black rounded-full p-3 shadow-lg transform active:scale-95 transition-transform">
            <PlusCircle size={28} className="text-white" />
          </div>
        </Link>

        {/* UTILITY: LOOKUP (Search) */}
        <Link href="/search" className="flex flex-col items-center justify-center w-full h-full space-y-1">
          <Search 
            size={24} 
            className={isActive('/search') ? 'text-black' : 'text-gray-400'} 
            strokeWidth={isActive('/search') ? 2.5 : 2}
          />
          <span className={`text-[10px] font-medium ${isActive('/search') ? 'text-black' : 'text-gray-400'}`}>
            {PIVOT_CONFIG.semantics.search}
          </span>
        </Link>

        {/* PILLAR 1: VAULT (Formerly Profile) */}
        <Link href="/vault" className="flex flex-col items-center justify-center w-full h-full space-y-1">
          <Lock 
            size={24} 
            className={isActive('/vault') ? 'text-black' : 'text-gray-400'} 
            strokeWidth={isActive('/vault') ? 2.5 : 2}
          />
          <span className={`text-[10px] font-medium ${isActive('/vault') ? 'text-black' : 'text-gray-400'}`}>
            {PIVOT_CONFIG.semantics.inventory}
          </span>
        </Link>

      </div>
    </nav>
  );
}
