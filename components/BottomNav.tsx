import Link from "next/link";
import { Home, ShoppingBag, Bell, MessageCircle, User, Repeat, Search } from "lucide-react";
import { useRouter } from "next/router";

export default function BottomNav() {
  const router = useRouter();

  const navItems = [
    { href: "/", icon: <Home size={20} />, label: "Feed" },
    { href: "/trade", icon: <Repeat size={20} />, label: "Charts" }, // NEW
    { href: "/search", icon: <Search size={20} />, label: "Search" }, // NEW
    { href: "/messages", icon: <MessageCircle size={20} />, label: "Chat" },
    { href: "/profile", icon: <User size={20} />, label: "Me" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-md flex justify-around py-2 z-50">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-col items-center text-xs ${
            router.pathname === item.href ? "text-blue-600" : "text-gray-600"
          }`}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
