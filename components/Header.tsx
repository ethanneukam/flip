// components/layout/Header.tsx
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { NotificationBell } from "./NotificationBell";
import { useRouter } from "next/router";
import { Settings, User, LogOut, Shield } from "lucide-react";

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
    <header className="w-full bg-white border-b border-gray-100 p-4 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md bg-white/80">
      {/* Updated Logo Section */}
      <Link href="/">
        <div className="flex items-center cursor-pointer group">
          <img 
            src="/logo.png" // Ensure your file is named logo.png in the public folder
            alt="FLIP Logo" 
            className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
          />
        </div>
      </Link>

      <div className="flex items-center space-x-3">
        {/* Notifications */}
        <div className="p-2 hover:bg-gray-50 rounded-full transition-colors cursor-pointer">
          <NotificationBell
            className="text-black"
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
              <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-gray-200 to-black hover:scale-105 transition-transform">
                <img
                  src={user.user_metadata?.avatar_url || defaultAvatar}
                  alt="Profile"
                  className="w-full h-full rounded-full border-2 border-white object-cover"
                />
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 overflow-hidden animate-slideDown py-2">
                <div className="px-4 py-3 border-b border-gray-50 mb-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Authenticated User</p>
                  <p className="text-xs font-bold truncate text-black">{user.email}</p>
                </div>

                <Link
                  href={`/profile?user_id=${user.id}`}
                  className="flex items-center space-x-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User size={16} />
                  <span>Vault Profile</span>
                </Link>

                <Link
                  href="/edit-profile"
                  className="flex items-center space-x-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Settings size={16} />
                  <span>Security Settings</span>
                </Link>

                <div className="border-t border-gray-50 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition text-left"
                  >
                    <LogOut size={16} />
                    <span>System Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/auth"
            className="px-6 py-2.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-gray-800 transition shadow-lg active:scale-95"
          >
            Access Vault
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
            transform: translateY(-8px) scale(0.95);
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
