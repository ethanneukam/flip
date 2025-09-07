// pages/upload.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { uploadImage } from "../lib/uploadImage";
import { useRouter } from "next/router";

export default function UploadPage() {
  const [session, setSession] = useState(null);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Check if user is logged in
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) router.push("/auth");
      }
    );
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (!session) return <p>Loading...</p>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    let imageUrl = null;
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
      if (!imageUrl) {
        setMessage("Image upload failed");
        setLoading(false);
        return;
      }
    }

    const tagsArray = tags.split(",").map((t) => t.trim()).filter(Boolean);

    const { data, error } = await supabase.from("items").insert([
      {
        title,
        description,
        price: price ? parseFloat(price) : null,
        image_url: imageUrl,
        category,
        tags: tagsArray,
        user_id: session.user.id,
      },
    ]);

    if (error) {
      console.error("Insert error:", error);
      setMessage("Failed to save item");
    } else {
      setMessage("Item uploaded successfully!");
      setTitle("");
      setPrice("");
      setDescription("");
      setCategory("");
      setTags("");
      setImageFile(null);
    }
    setLoading(false);
  };

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Upload an Item</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
        <input
          className="w-full p-2 border"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          className="w-full p-2 border"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          type="number"
          step="0.01"
          required
        />
        <textarea
          className="w-full p-2 border"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="w-full p-2 border"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <input
          className="w-full p-2 border"
          placeholder="Tags (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
        />
        <button
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Uploading..." : "Upload Item"}
        </button>
        {message && <p>{message}</p>}
      </form>
    </main>
  );
}