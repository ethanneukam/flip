import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { NotificationBell } from "./NotificationBell"; // ✅ note the curly braces

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown if clicked outside
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
  };

  const defaultAvatar = "/default-avatar.png";

  return (
    <header className="w-full bg-white shadow-md p-4 flex justify-between items-center relative">
      <Link href="/">
        <h1 className="text-2xl font-bold cursor-pointer">Flip</h1>
      </Link>

      <div className="flex items-center space-x-4 relative">
        {/* Notifications button */}
        <Link href="/notifications">
          <NotificationBell className="cursor-pointer" />
        </Link>

        {/* Login/Profile */}
        {user ? (
          <div ref={dropdownRef} className="relative">
            <img
              src={user.user_metadata?.avatar_url || defaultAvatar}
              alt="Profile"
              className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-blue-500 cursor-pointer transition-all duration-200"
              onClick={() => setDropdownOpen((prev) => !prev)}
            />

            {/* Modern Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-xl z-50 overflow-hidden animate-slideDown">
                <Link
                  href={`/profile?user_id=${user.id}`}
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                  onClick={() => setDropdownOpen(false)}
                >
                  View Profile
                </Link>
                <Link
                  href="/edit-profile"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                  onClick={() => setDropdownOpen(false)}
                >
                  Edit Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Login / Signup
          </Link>
        )}
      </div>

      <style jsx>{`
        .animate-slideDown {
          animation: slideDown 0.2s ease-out forwards;
        }
        @keyframes slideDown {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </header>
  );
}