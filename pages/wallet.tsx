import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import BottomNav from "../components/BottomNav";

export default function WalletPage() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: wallet } = await supabase
      .from("flip_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    setBalance(wallet?.balance || 0);

    const { data: txs } = await supabase
      .from("flip_transactions")
      .select("*, from_user:profiles!from_user(username), to_user:profiles!to_user(username)")
      .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
      .order("created_at", { ascending: false });

    setTransactions(txs || []);
  };

  return (
    <main className="max-w-md mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-2">💳 Flip Wallet</h1>
      <p className="text-lg mb-6">Balance: <strong>${balance.toFixed(2)}</strong></p>

      <button
        onClick={async () => {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from("flip_wallets")
            .update({ balance: balance + 10 })
            .eq("user_id", user.id);
          await supabase.from("flip_transactions")
            .insert([{ to_user: user.id, amount: 10, type: "deposit", status: "released", note: "Test top-up" }]);
          loadWallet();
        }}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Add $10 (Demo)
      </button>

      <h2 className="text-xl font-semibold mt-6 mb-2">Transaction History</h2>
      <ul className="divide-y">
        {transactions.map((t) => (
          <li key={t.id} className="py-2">
            <p className="text-sm">
              <span className="font-semibold">{t.type}</span> - ${t.amount.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">
              {t.status} • {new Date(t.created_at).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
      <BottomNav />
    </main>
  );
}
useEffect(() => {
  const sub = supabase
    .channel("realtime:wallets")
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "flip_wallets" }, (payload) => {
      setBalance(payload.new.balance);
    })
    .subscribe();

  return () => supabase.removeChannel(sub);
}, []);
