// components/Header.tsx
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { NotificationBell } from "./NotificationBell";
import { useRouter } from "next/router";
import { Settings, User, LogOut, Activity, Crown, Zap, Terminal } from "lucide-react";


export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [tier, setTier] = useState<string>("FREE");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();


  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
     
      if (user) {
        // Fetch user tier from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('tier')
          .eq('id', user.id)
          .single();
        if (profile?.tier) setTier(profile.tier.toUpperCase());
      }
    };
    fetchUser();


    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });


    return () => listener?.subscription.unsubscribe();
  }, []);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    setDropdownOpen(false);
    router.push("/auth");
  };


  const defaultAvatar = "/default-avatar.png";
useEffect(() => {
  const channel = supabase
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'feed_events' },
      (payload) => {
        // Logic to show a popup or sound when a new notification arrives
        console.log('New System Log:', payload.new.message);
        // You could use a library like 'react-hot-toast' here
      }
    )
    .subscribe();


  return () => { supabase.removeChannel(channel); };
}, []);
 return (
    <header className="w-full bg-[#0B0E11] border-b border-white/10 p-4 sticky top-0 z-50 backdrop-blur-md bg-[#0B0E11]/90">
      <div className="max-w-[1400px] mx-auto flex justify-between items-center">
       
        {/* LEFT SIDE: LOGO */}
        <Link href="/charts">
          <div className="flex items-center cursor-pointer group space-x-2">
            <img
              src="/logo.png"
              alt="FLIP Logo"
              className="h-8 w-auto object-contain brightness-0 invert transition-transform group-hover:scale-105"
            />
            <div className="h-4 w-[1px] bg-white/20 mx-2 hidden sm:block"></div>
            <span className="hidden sm:block text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">Terminal_v3</span>
          </div>
        </Link>


   {/* RIGHT SIDE: ACTIONS */}
        <div className="flex items-center space-x-3 sm:space-x-6">
         
          {/* UPGRADE OR DASHBOARD BUTTON */}
          {user && (tier.toLowerCase() === "free" || !tier) ? (
            <button
              onClick={() => router.push('/pricing')}
              className="flex items-center space-x-2 px-3 py-1.5 bg-[#e8ff47]/5 border border-[#e8ff47]/20 rounded-lg group hover:border-[#e8ff47]/50 hover:bg-[#e8ff47]/10 transition-all shadow-[0_0_15px_rgba(232,255,71,0.05)]"
            >
              <Terminal size={14} className="text-[#e8ff47]" />
              <span className="text-[10px] font-black text-[#e8ff47] uppercase tracking-tighter hidden sm:inline">
                DEV/API UPGRADE
              </span>
            </button>
          ) : user && (
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg group hover:border-green-500/60 hover:bg-green-500/20 transition-all shadow-[0_0_15px_rgba(34,197,94,0.1)]"
            >
              <Activity size={14} className="text-green-400" />
              <span className="text-[10px] font-black text-green-400 uppercase tracking-tighter hidden sm:inline">
                API DASHBOARD
              </span>
            </button>
          )}


          {/* STATUS INDICATOR */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-mono text-white/60 uppercase">Market_Open</span>
          </div>


          {user ? (
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center focus:outline-none group"
              >
                <div className="w-10 h-10 rounded-xl p-0.5 bg-[#111] border border-white/10 group-hover:border-[#e8ff47]/50 group-hover:shadow-[0_0_15px_rgba(232,255,71,0.1)] transition-all relative overflow-visible">
                  <img
                    src="/logo.png"
                    alt="Flip Logo"
                    className="w-full h-full rounded-[10px] object-contain"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#050505]
                    ${(tier?.toLowerCase() === 'free' || !tier) ? 'bg-zinc-600' : 'bg-[#e8ff47] shadow-[0_0_8px_#e8ff47]'}`}
                  />
                </div>
              </button>


              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-[#161A1E] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-2 animate-slideDown">
                  <div className="px-4 py-3 border-b border-white/5 mb-1 flex justify-between items-start">
                    <div>
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Authenticated Operator</p>
                      <p className="text-xs font-mono truncate text-white/90">{user.email}</p>
                    </div>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 bg-white/5 rounded border border-white/10 text-white/40">{tier}</span>
                  </div>


                  <Link
                    href={`/vault`}
                    className="flex items-center space-x-3 px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/5 transition hover:text-white"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <User size={16} className="text-blue-500" />
                    <span>Vault Assets</span>
                  </Link>


                  <Link
                    href="/charts"
                    className="flex items-center space-x-3 px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/5 transition hover:text-white"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Zap size={16} className="text-amber-500" />
                    <span>Pinned Watchlist</span>
                  </Link>


                  <Link
                    href="/edit-profile"
                    className="flex items-center space-x-3 px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/5 transition hover:text-white"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Settings size={16} className="text-white/40" />
                    <span>Terminal Config</span>
                  </Link>


                  <div className="border-t border-white/5 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 transition text-left"
                    >
                      <LogOut size={16} />
                      <span>Terminate Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth"
              className="px-6 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-900/20 active:scale-95 border border-blue-400/20"
            >
              Access Terminal
            </Link>
          )}
        </div>
      </div>


      <style >{`
        .animate-slideDown {
          animation: slideDown 0.2s cubic-bezier(0, 0, 0.2, 1) forwards;
        }
        @keyframes slideDown {
          0% {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </header>
 )
}
