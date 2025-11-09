// pages/dashboard.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 6;

  // check auth session
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login"); // redirect if not logged in
      } else {
        setSession(data.session);
      }
    };
    getSession();
  }, [router]);

  if (!session) return <p className="p-6">Loading...</p>;

  // logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ✅ Verify Identity handler
  const handleVerify = async () => {
    const res = await fetch("/api/identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: session.user.id }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url; // redirect to Stripe Identity flow
    }
  };

  // fetch items (with pagination)
  const fetchItems = async (reset = false) => {
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("id", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching items:", error.message);
      return;
    }

    if (reset) {
      setItems(data || []);
    } else {
      setItems((prev) => [...prev, ...(data || [])]);
    }

    if (!data || data.length < ITEMS_PER_PAGE) {
      setHasMore(false);
    } else {
      setHasMore(true);
    }
  };

  // fetch transactions
  const fetchTransactions = async () => {
    const res = await fetch("/api/transactions");
    const data = await res.json();
    setTransactions(data || []);
  };

  // subscriptions
  useEffect(() => {
    fetchItems(true);
    const itemSubscription = supabase
      .channel("items-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        () => fetchItems(true)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(itemSubscription);
    };
  }, [page]);

  useEffect(() => {
    fetchTransactions();
    const txSubscription = supabase
      .channel("transactions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => fetchTransactions()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(txSubscription);
    };
  }, []);

  // edit
  const handleEdit = async (id: number, updates = {}) => {
    const oldItems = [...items];
    setItems(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    const { error } = await supabase.from("items").update(updates).eq("id", id);
    if (error) {
      console.error("Edit error:", error.message);
      setItems(oldItems);
    }
  };

  // delete
  const handleDelete = async (id: number) => {
    const oldItems = [...items];
    setItems(items.filter((item) => item.id !== id));
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) {
      console.error("Delete error:", error.message);
      setItems(oldItems);
    }
  };

  // handle infinite scroll
  const handleScroll = () => {
    if (
      window.innerHeight + document.documentElement.scrollTop + 200 >=
      document.documentElement.scrollHeight
    ) {
      if (hasMore) {
        setPage((prev) => prev + 1);
      }
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore]);

  return (
    <main className="p-6">
      {/* Header with logout */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-900"
        >
          Logout
        </button>
      </div>

      {/* ✅ Verify Identity button */}
      {!session.user?.verified && (
        <button
          onClick={handleVerify}
          className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
        >
          Verify Identity
        </button>
      )}

      {/* Items Section */}
      <h2 className="text-xl font-semibold mb-2">Items</h2>
      {items.length === 0 ? (
        <p>No items found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="border p-4 rounded shadow-sm hover:shadow-md transition"
            >
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-40 object-cover mb-2 rounded"
                />
              )}
              <h2 className="font-semibold flex items-center">
                {item.title}
                {/* ✅ Sold badge */}
                {item.status === "sold" && (
                  <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full ml-2">
                    Sold
                  </span>
                )}
              </h2>
              <p className="text-gray-600">{item.description}</p>
              <p className="font-bold">${item.price}</p>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() =>
                    handleEdit(item.id, { title: item.title + " (edited)" })
                  }
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more indicator */}
      {hasMore ? (
        <p className="text-center mt-4">Loading more...</p>
      ) : (
        <p className="text-center mt-4">No more items</p>
      )}

      {/* Transactions Section */}
      <h2 className="text-xl font-semibold mt-6 mb-2">Transactions</h2>
      {transactions.length === 0 ? (
        <p>No transactions found.</p>
      ) : (
        <ul className="list-disc pl-5">
          {transactions.map((tx) => (
            <li key={tx.id}>
              {tx.item_name} – ${tx.amount} ({tx.status})
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}