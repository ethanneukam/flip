import Link from "next/link";
import { NotificationBell } from "./NotificationBell"; // ✅ correct import

export default function Header() {
  return (
    <header className="w-full bg-white shadow-md p-4 flex justify-between items-center">
      <Link href="/">
        <h1 className="text-2xl font-bold">Flip</h1>
      </Link>
      <div className="flex items-center space-x-4">
        <NotificationBell />
      </div>
    </header>
  );
}