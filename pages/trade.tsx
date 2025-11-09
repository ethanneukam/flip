// pages/trade.tsx
import Link from "next/link";

export default function TradePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-4">Trade Hub</h1>
      <p className="mb-6 text-gray-600">
        Here you’ll be able to swap items with other users. Feature coming soon!
      </p>
      <Link
        href="/marketplace"
        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
      >
        Go to Marketplace
      </Link>
    </main>
  );
}