// components/ItemUploadForm.js
"use client"; // if using app router; safe in pages as well
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { uploadImage } from "../lib/uploadImage";

export default function ItemUploadForm() {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    const { data, error } = await supabase.from("categories").select("name").order("name");
    if (!error) setCategories(data.map((r) => r.name));
    else console.error("fetch categories error", error);
  }

  async function uploadImage(file) {
    if (!file) return null;
    const fileExt = file.name.split(".").pop();
    const filePath = `public/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from("item-images")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (error) {
      console.error("Storage upload error:", error);
      return null;
    }

    // get public url
    const { data: publicData } = supabase.storage.from("item-images").getPublicUrl(data.path);
    return publicData?.publicUrl || null;
  }

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setMessage("");

  // validation checks
  if (!title.trim()) {
    setMessage("Title is required.");
    setLoading(false);
    return;
  }

  if (!price || parseFloat(price) <= 0) {
    setMessage("Price must be greater than 0.");
    setLoading(false);
    return;
  }

  if (!category) {
    setMessage("Please choose a category.");
    setLoading(false);
    return;
  }

  // upload image
  let imageUrl = null;
  if (imageFile) {
    imageUrl = await uploadImage(imageFile);
    if (!imageUrl) {
      setMessage("Image upload failed. Please try again.");
      setLoading(false);
      return;
    }
  }

  // process tags
  const tagsArray = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // insert into Supabase
  const { data, error } = await supabase.from("items").insert([
    {
      title,
      description,
      price: parseFloat(price),
      image_url: imageUrl,
      category,
      tags: tagsArray,
    },
  ]).select();

  if (error) {
    console.error("Insert error:", error);
    setMessage("Failed to save item: " + error.message);
  } else {
    setMessage("Item uploaded successfully!");
    // reset form
    setTitle("");
    setPrice("");
    setDescription("");
    setCategory("");
    setTags("");
    setImageFile(null);
  }

  setLoading(false);
};


    // tags: split by comma, trim, remove empties
    const tagsArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const { data, error } = await supabase.from("items").insert([
      {
        title,
        description,
        price: price ? parseFloat(price) : null,
        image_url: imageUrl,
        category,
        tags: tagsArray,
      },
    ]).select();

    if (error) {
      console.error("Insert error:", error);
      setMessage("Failed to save item");
    } else {
      setMessage("Item uploaded successfully!");
      // reset form
      setTitle("");
      setPrice("");
      setDescription("");
      setCategory("");
      setTags("");
      setImageFile(null);
    }
    setLoading(false);
  };
<div className="mb-4">
  <label className="block mb-1 font-medium">Image</label>
<div className="mb-4">
  <label className="block mb-1 font-medium">Image</label>
  <input
    type="file"
    accept="image/*"
    onChange={(e) => {
      if (e.target.files && e.target.files[0]) {
        setImageFile(e.target.files[0]);
      }
    }}
  />

  {imageFile && (
    <div className="mt-2">
      <p className="text-sm text-gray-600">Preview:</p>
      <img
        src={URL.createObjectURL(imageFile)}
        alt="Preview"
        className="w-full h-40 object-cover rounded border"
      />
    </div>
  )}
</div>


 
</div>
return (
  <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 space-y-4">
    {/* Title */}
    <input
      className="w-full p-2 border"
      placeholder="Title"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      required
    />

    {/* Price */}
    <input
      className="w-full p-2 border"
      placeholder="Price"
      value={price}
      onChange={(e) => setPrice(e.target.value)}
      type="number"
      step="0.01"
      required
    />

    {/* Description */}
    <textarea
      className="w-full p-2 border"
      placeholder="Description"
      value={description}
      onChange={(e) => setDescription(e.target.value)}
    />

    {/* Category */}
    <select
      className="w-full p-2 border"
      value={category}
      onChange={(e) => setCategory(e.target.value)}
    >
      <option value="">Choose category</option>
      {categories.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>

    {/* Tags */}
    <input
      className="w-full p-2 border"
      placeholder="Tags (comma-separated)"
      value={tags}
      onChange={(e) => setTags(e.target.value)}
    />

    {/* Image upload */}
    <input
      type="file"
      accept="image/*"
      onChange={(e) => {
        if (e.target.files && e.target.files[0]) {
          setImageFile(e.target.files[0]);
        }
      }}
    />

    {/* ✅ Live image preview (disappears after successful upload) */}
    {imageFile && (
      <div className="mt-2">
        <p className="text-sm text-gray-600 mb-1">Preview:</p>
        <img
          src={URL.createObjectURL(imageFile)}
          alt="Preview"
          className="w-full h-40 object-cover rounded border"
        />
      </div>
    )}

    {/* Submit button */}
    <button
      disabled={loading}
      className="bg-blue-600 text-white px-4 py-2 rounded"
    >
      {loading ? "Uploading..." : "Upload Item"}
    </button>

    {/* Success/error message */}
 {message && (
  <p className={`mt-2 ${message.includes("successfully") ? "text-green-600" : "text-red-600"}`}>
    {message}
  </p>
)}
  </form>
);