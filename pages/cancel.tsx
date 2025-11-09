// pages/cancel.tsx
import { useRouter } from "next/router";

export default function CancelPage() {
  const router = useRouter();

  return (
    <main className="flex flex-col items-center justify-center h-screen text-center">
      <h1 className="text-3xl font-bold text-red-600 mb-4">
        ❌ Payment Cancelled
      </h1>
      <p className="text-gray-700 mb-6">
        Your order was cancelled. No charges were made.
      </p>
      <button
        onClick={() => router.push("/items")}
        className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
      >
        Back to Marketplace
      </button>
    </main>
  );
}