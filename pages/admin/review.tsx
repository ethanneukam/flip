// pages/admin/review.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function AdminReviewPage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadQueue() {
    setLoading(true);
    const { data } = await supabase
      .from("review_queue")
      .select("*, profiles:items!inner(user_id) ( user_id ) , items:items(*)")
      .eq("status", "flagged")
      .order("created_at", { ascending: false })
      .limit(50);
    setQueue(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadQueue();
  }, []);

  async function updateStatus(id: string, status: string) {
    await supabase.from("review_queue").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    // also update items if approved/rejected
    const entry = queue.find((q) => q.id === id);
    if (entry && entry.item_id) {
      if (status === "approved") {
        await supabase.from("items").update({ moderated: true }).eq("id", entry.item_id);
      }
      if (status === "rejected") {
        await supabase.from("items").update({ hidden: true }).eq("id", entry.item_id);
      }
    }
    loadQueue();
  }

  if (loading) return <p>Loading...</p>;

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold mb-4">Review Queue</h1>
      {queue.length === 0 && <p>No flagged items.</p>}
      <div className="space-y-4">
        {queue.map((q) => (
          <div key={q.id} className="bg-white rounded-lg p-4 shadow">
            <div className="flex gap-4">
              <img src={q.image_url} alt="flagged" className="w-32 h-32 object-cover rounded" />
              <div className="flex-1">
                <p className="font-semibold">Item ID: {q.item_id}</p>
                <p className="text-sm">Score: {q.score}</p>
                <pre className="text-xs max-h-32 overflow-auto bg-gray-50 p-2 rounded">{JSON.stringify(q.raw_result, null, 2)}</pre>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => updateStatus(q.id, "approved")} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button>
                  <button onClick={() => updateStatus(q.id, "rejected")} className="px-3 py-1 bg-red-600 text-white rounded">Reject & Hide</button>
                  <button onClick={() => updateStatus(q.id, "reviewed")} className="px-3 py-1 bg-gray-300 rounded">Mark Reviewed</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
