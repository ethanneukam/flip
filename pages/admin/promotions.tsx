// pages/admin/promotions.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient"; // make sure you have client helper for browser (anon key)
import { useRouter } from "next/router";

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [itemId, setItemId] = useState("");
  const [cpc, setCpc] = useState("0.50");
  const [budget, setBudget] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchList();
  }, []);

  async function fetchList() {
    const { data } = await supabase.from("promotions").select("*").order("created_at", { ascending: false }).limit(50);
    setPromotions(data || []);
  }

  async function createPromo(e: any) {
    e.preventDefault();
    // in production, use server API to verify seller identity; here we assume current user is seller
    const { data: profile } = await supabase.from("profiles").select("id").limit(1).single();
    const seller_id = profile?.id;
    if (!seller_id) return alert("No seller id found in profiles (stub).");

    const resp = await fetch("/api/promotions/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId, seller_id, cpc: Number(cpc), budget: budget ? Number(budget) : null }),
    });

    const j = await resp.json();
    if (!j?.ok) return alert("Failed: " + (j.error || JSON.stringify(j)));
    setItemId(""); setCpc("0.50"); setBudget("");
    fetchList();
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Promotions (Admin)</h1>

      <form onSubmit={createPromo} className="space-y-3 mb-6">
        <input placeholder="item_id" value={itemId} onChange={(e)=>setItemId(e.target.value)} className="w-full border p-2 rounded" />
        <div className="flex gap-2">
          <input placeholder="cpc" value={cpc} onChange={(e)=>setCpc(e.target.value)} className="flex-1 border p-2 rounded" />
          <input placeholder="budget (optional)" value={budget} onChange={(e)=>setBudget(e.target.value)} className="flex-1 border p-2 rounded" />
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Create</button>
      </form>

      <div className="space-y-3">
        {promotions.map((p) => (
          <div key={p.id} className="p-3 border rounded flex justify-between items-start">
            <div>
              <div className="font-medium">{p.item_id} • ${p.cpc} per click</div>
              <div className="text-sm text-gray-500">Status: {p.status} • Spent: ${p.spent || 0}</div>
            </div>
            <div className="text-right">
              <button onClick={() => router.push(`/item/${p.item_id}`)} className="text-sm underline">View</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
