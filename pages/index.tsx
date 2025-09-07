// pages/index.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function HomePage() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const categories = ["Electronics", "Clothing", "Books", "Furniture", "Other"];

  useEffect(() => {
    const fetchItems = async () => {
      let query = supabase.from("items").select("*");

      if (category) {
        query = query.eq("category", category);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching items:", error.message);
      } else {
        setItems(data || []);
      }
    };

    fetchItems();
  }, [search, category]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Marketplace</h1>

      {/* Search + Category Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search items..."
          className="p-2 border flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="p-2 border"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Item Feed */}
      {items.length === 0 ? (
        <p>No items found.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item) => (
            <li key={item.id} className="border p-4 rounded">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-40 object-cover mb-2"
                />
              )}
              <h2 className="font-semibold">{item.title}</h2>
              <p>{item.description}</p>
              <p className="font-bold">${item.price}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}