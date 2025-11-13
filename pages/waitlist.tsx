import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const router = useRouter();
  const ref = router.query.ref as string | undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    const res = await fetch("/api/join-waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, ref }),
    });

    if (res.ok) {
      const data = await res.json();
      setReferralCode(data.referralCode);
      setStatus("success");
      setEmail("");
    } else setStatus("error");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
      <div className="p-8 max-w-md w-full bg-white rounded-2xl shadow-xl text-center">
        <h1 className="text-3xl font-extrabold mb-2 text-gray-900">Join the Flip Waitlist</h1>
        <p className="text-gray-600 mb-6">
          Be part of the <b>Everything Exchange</b> — where anyone can buy, sell, or trade anything.
        </p>

        {!referralCode ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition font-semibold"
            >
              {status === "loading" ? "Joining..." : "Join Waitlist"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-lg font-medium text-green-600">
              You’re on the list! 🚀
            </p>
            <div className="bg-gray-100 p-3 rounded-lg text-sm break-all">
              <p>Your referral link:</p>
              <p className="font-mono text-black">
                {`https://getflip.app/waitlist?ref=${referralCode}`}
              </p>
            </div>
            <button
              onClick={() =>
                navigator.clipboard.writeText(`https://getflip.app/waitlist?ref=${referralCode}`)
              }
              className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition"
            >
              Copy Link
            </button>
          </div>
        )}

        {status === "error" && (
          <p className="text-red-500 mt-4">Something went wrong. Try again.</p>
        )}
      </div>
    </div>
  );
}