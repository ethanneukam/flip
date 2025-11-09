// pages/edit/[id].js
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import AuthWrapper from "../../components/AuthWrapper";

export default function EditItemPage() {
  const router = useRouter();
  const { id } = router.query;

  const [item, setItem] = useState({
    title: "",
    price: "",
    description: "",
    category: "",
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchItem = async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .single();
      if (error) console.error(error);
      else setItem(data);
      setLoading(false);
    };
    fetchItem();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from("items")
      .update({
        title: item.title,
        price: item.price,
        description: item.description,
        category: item.category,
      })
      .eq("id", id);

    if (error) setMessage("Update failed.");
    else {
      setMessage("Item updated successfully!");
      setTimeout(() => router.push("/profile"), 1000);
    }
    setLoading(false);
  };

  if (loading) return <p>Loading item...</p>;

  return (
    <AuthWrapper>
      <main className="max-w-md mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">Edit Item</h1>
        <form onSubmit={handleUpdate} className="space-y-4">
          <input
            className="w-full p-2 border"
            value={item.title}
            onChange={(e) => setItem({ ...item, title: e.target.value })}
            placeholder="Title"
          />
          <input
            className="w-full p-2 border"
            type="number"
            value={item.price}
            onChange={(e) => setItem({ ...item, price: e.target.value })}
            placeholder="Price"
          />
          <textarea
            className="w-full p-2 border"
            value={item.description}
            onChange={(e) => setItem({ ...item, description: e.target.value })}
            placeholder="Description"
          />
          <input
            className="w-full p-2 border"
            value={item.category}
            onChange={(e) => setItem({ ...item, category: e.target.value })}
            placeholder="Category"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded w-full"
          >
            {loading ? "Updating..." : "Save Changes"}
          </button>
        </form>
        {message && <p>{message}</p>}
      </main>
    </AuthWrapper>
  );
}1