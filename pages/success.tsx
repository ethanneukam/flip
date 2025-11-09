// pages/success.tsx
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Optionally redirect to dashboard after a few seconds
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 4000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex flex-col items-center justify-center h-screen text-center">
      <h1 className="text-3xl font-bold text-green-600 mb-4">
        ✅ Payment Successful!
      </h1>
      <p className="text-gray-700 mb-6">
        Thank you for your purchase. You’ll be redirected shortly.
      </p>
      <button
        onClick={() => router.push("/dashboard")}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Go to Dashboard
      </button>
    </main>
  );
}