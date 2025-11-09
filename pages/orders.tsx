import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import AuthWrapper from "../components/AuthWrapper";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("orders")
        .select("*, items(title, image_url)")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!error) setOrders(data);
      setLoading(false);
    };
    loadOrders();
  }, []);

  const updateOrder = async (orderId: string, status: string) => {
    await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, status }),
    });
  };

  if (loading) return <p>Loading...</p>;

  return (
    <AuthWrapper>
      <main className="max-w-md mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">Orders</h1>

        {orders.length === 0 ? (
          <p className="text-gray-500">No orders yet.</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="border rounded p-3 bg-white shadow-sm">
              <div className="flex items-center space-x-3">
                {order.items?.image_url && (
                  <img
                    src={order.items.image_url}
                    className="w-16 h-16 object-cover rounded"
                    alt={order.items.title}
                  />
                )}
                <div>
                  <p className="font-semibold">{order.items?.title}</p>
                  <p className="text-sm text-gray-600">Status: {order.status}</p>
                  <p className="text-sm font-bold">${order.total}</p>
                </div>
              </div>

              {["pending", "paid", "shipped"].includes(order.status) && (
                <div className="mt-2 space-x-2">
                  {order.status === "pending" && (
                    <button
                      onClick={() => updateOrder(order.id, "paid")}
                      className="bg-green-600 text-white px-3 py-1 rounded"
                    >
                      Mark as Paid
                    </button>
                  )}
                  {order.status === "paid" && (
                    <button
                      onClick={() => updateOrder(order.id, "shipped")}
                      className="bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      Mark as Shipped
                    </button>
                  )}
                  {order.status === "shipped" && (
                    <button
                      onClick={() => updateOrder(order.id, "delivered")}
                      className="bg-purple-600 text-white px-3 py-1 rounded"
                    >
                      Mark as Delivered
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </AuthWrapper>
  );
}