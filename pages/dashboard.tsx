// pages/dashboard.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Dashboard() {
  const [items, setItems] = useState<any[]>([]);

  // fetch items
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase.from("items").select("*");
    if (error) {
      console.error("Error fetching items:", error.message);
    } else {
      setItems(data || []);
    }
  };

  // delete an item
  const handleDelete = async (id: number) => {
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) {
      console.error("Delete error:", error.message);
    } else {
      setItems(items.filter((item) => item.id !== id)); // update local state
    }
  };

  // placeholder for edit
  const handleEdit = (id: number) => {
    alert(`Edit feature not implemented yet for item ID: ${id}`);
  };

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

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
              <h2 className="font-semibold">{item.title}</h2>
              <p className="text-gray-600">{item.description}</p>
              <p className="font-bold">${item.price}</p>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleEdit(item.id)}
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
    </main>
  );
}