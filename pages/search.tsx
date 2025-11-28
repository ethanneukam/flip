// pages/search.tsx
import Link from "next/link";

export default function SearchPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-4">Search Listings</h1>
      <p className="mb-6 text-gray-600">
        This will be your advanced search hub with filters + AI matching.
      </p>
      <Link
        href="/index"
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        Go to Marketplace
      </Link>
    </main>
  );
}
