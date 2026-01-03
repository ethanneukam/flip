// components/layout/Header.tsx
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { NotificationBell } from "./NotificationBell";
import { useRouter } from "next/router";
import { Settings, User, LogOut, Activity } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
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

  return (
    <header className="w-full bg-[#0B0E11] border-b border-white/10 p-4 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md bg-[#0B0E11]/90">
      {/* Updated Logo Section */}
      <Link href="/">
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

      <div className="flex items-center space-x-4">
        {/* Status Indicator (Broker Style) */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[9px] font-mono text-white/60 uppercase">Market_Open</span>
        </div>

        {/* Notifications */}
        <div className="hover:bg-white/5 p-2 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-white/10">
          <NotificationBell
            className="text-white"
            onClick={() => router.push("/notifications")}
          />
        </div>

        {/* User Actions */}
        {user ? (
          <div ref={dropdownRef} className="relative">
            <button 
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl p-0.5 bg-gradient-to-tr from-blue-600 to-indigo-900 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all">
                <img
                  src={user.user_metadata?.avatar_url || defaultAvatar}
                  alt="Profile"
                  className="w-full h-full rounded-[10px] border border-black/20 object-cover"
                />
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-[#161A1E] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-2 animate-slideDown">
                <div className="px-4 py-3 border-b border-white/5 mb-1">
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Authenticated Operator</p>
                  <p className="text-xs font-mono truncate text-white/90">{user.email}</p>
                </div>

                <Link
                  href={`/profile?user_id=${user.id}`}
                  className="flex items-center space-x-3 px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/5 transition hover:text-white"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User size={16} className="text-blue-500" />
                  <span>Vault Assets</span>
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

      <style jsx>{`
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
  );
}