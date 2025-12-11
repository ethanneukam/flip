// pages/upload.js

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { uploadImage } from "../lib/uploadImage";
import { useRouter } from "next/router";
import { useAuthRedirect } from "../lib/useAuth";
import dynamic from "next/dynamic";

const Picker = dynamic(() => import("emoji-picker-react"), { ssr: false });

export default function UploadPage() {
  const session = useAuthRedirect(true);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [imageFiles, setImageFiles] = useState([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [currentSession, setCurrentSession] = useState(session);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const carouselRef = useRef(null);
  const audioRef = useRef(null);
  const fadeInterval = useRef(null);

  const commonTags = ["Cars", "Tech", "Fashion", "Collectibles", "Gadgets", "Lifestyle", "Art"];

  const commonTracks = [
    { name: "Chill Vibes", file: "/tracks/chill-vibes.mp3" },
    { name: "Upbeat Energy", file: "/tracks/upbeat-energy.mp3" },
    { name: "Lo-Fi Beats", file: "/tracks/lofi-beats.mp3" },
  ];
  const [selectedTrack, setSelectedTrack] = useState(null);

  // Audio fade helpers
  const fadeIn = (audio, duration = 1000) => {
    if (!audio) return;
    audio.volume = 0;
    audio.play().catch(() => {});
    const step = 0.05;
    fadeInterval.current = setInterval(() => {
      if (audio.volume < 1) audio.volume = Math.min(audio.volume + step, 1);
      else clearInterval(fadeInterval.current);
    }, duration * step);
  };

  const fadeOut = (audio, duration = 1000) => {
    if (!audio) return;
    const step = 0.05;
    fadeInterval.current = setInterval(() => {
      if (audio.volume > 0) audio.volume = Math.max(audio.volume - step, 0);
      else {
        clearInterval(fadeInterval.current);
        audio.pause();
        audio.currentTime = 0;
      }
    }, duration * step);
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setCurrentSession(newSession);
      if (!newSession) router.push("/auth");
    });

    return () => authListener.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (selectedTrack) fadeIn(audioRef.current, 800);
    else fadeOut(audioRef.current, 800);
  }, [selectedTrack]);

  if (!currentSession) return <p>Loading...</p>;

  // --- File Controls ---
  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles((prev) => [...prev, ...files].slice(0, 4));
  };

  const removeImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveImage = (index, direction) => {
    const newFiles = [...imageFiles];
    const swapIndex = direction === "left" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newFiles.length) return;
    [newFiles[index], newFiles[swapIndex]] = [newFiles[swapIndex], newFiles[index]];
    setImageFiles(newFiles);
  };

  const handleTagClick = (tag) => {
    const arr = tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (!arr.includes(tag)) setTags((prev) => (prev ? prev + ", " + tag : tag));
  };

  const scrollToImage = (index) => {
    const width = carouselRef.current.offsetWidth;
    carouselRef.current.scrollTo({ left: width * index, behavior: "smooth" });
  };

  // --- SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let imageUrls = [];
    for (let file of imageFiles) {
      const url = await uploadImage(file);
      if (!url) {
        setMessage("Image upload failed");
        setLoading(false);
        return;
      }
      imageUrls.push(url);
    }

    const tagsArray = tags.split(",").map((t) => t.trim()).filter(Boolean);

    const { error } = await supabase.from("items").insert([
      {
        title,
        description,
        price: price ? parseFloat(price) : null,
        image_url: imageUrls[0] || null,
        additional_images: imageUrls.slice(1),
        category,
        tags: tagsArray,
        music_url: selectedTrack?.file || null,
        user_id: currentSession.user.id,
      },
    ]);

    if (error) setMessage("Failed to save item");
    else {
        // Award coins for creating a listing
await fetch("/api/coins/award", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: user.id,   // whichever variable contains the logged in user
    amount: 3,
    reason: "Created a listing",
    related_id: listingId, // the ID from the saved listing
  }),
});

// after item insert and you have itemId & imageUrl
await fetch("/api/moderate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ item_id: itemId, image_url: imageUrl }),
});

      setMessage("Posted!");
      setTitle("");
      setPrice("");
      setDescription("");
      setCategory("");
      setTags("");
      setImageFiles([]);
      setSelectedTrack(null);
    }

    setLoading(false);
  };

  return (
    <main className="bg-white min-h-screen flex flex-col">
      {/* Header like TikTok */}
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-20">
        <button onClick={() => router.back()} className="text-gray-500 font-semibold">
          Cancel
        </button>

        <h2 className="text-lg font-semibold">Create</h2>

        <button
          onClick={handleSubmit}
          disabled={!title && imageFiles.length === 0}
          className="text-blue-600 font-semibold disabled:opacity-40"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>

      {/* Content Scroll */}
      <div className="p-4 space-y-6 max-w-lg mx-auto w-full">

        {/* FULL WIDTH CAROUSEL LIKE TIKTOK */}
        <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-gray-100" ref={carouselRef}>
          {imageFiles.length > 0 ? (
            imageFiles.map((file, index) => (
              <div key={index} className="relative w-full h-full inline-block">
                <img
                  src={URL.createObjectURL(file)}
                  className="object-cover w-full h-full"
                />

                {/* Floating delete */}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-3 right-3 bg-black bg-opacity-60 text-white p-2 rounded-full text-sm"
                >
                  ✕
                </button>

                {/* Floating reorder */}
                <div className="absolute bottom-3 left-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => moveImage(index, "left")}
                    className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-xs"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(index, "right")}
                    className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-xs"
                  >
                    →
                  </button>
                </div>
              </div>
            ))
          ) : (
            <label className="flex items-center justify-center w-full h-full cursor-pointer text-gray-400 text-4xl">
              +
              <input type="file" accept="image/*" className="hidden" multiple onChange={handleFilesChange} />
            </label>
          )}
        </div>

        {/* Dots */}
        {imageFiles.length > 1 && (
          <div className="flex justify-center gap-2 mt-2">
            {imageFiles.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToImage(idx)}
                className="w-2 h-2 rounded-full bg-gray-400"
              />
            ))}
          </div>
        )}

        {/* Title */}
        <input
          className="w-full border-b p-2 text-lg font-semibold"
          placeholder="Title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Description */}
        <div className="relative">
          <textarea
            className="w-full border-b p-2 resize-none"
            placeholder="Write a caption..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="absolute bottom-2 right-2 text-2xl"
          >
            😊
          </button>

          {showEmojiPicker && (
            <div className="absolute z-50 top-full right-0 mt-2 shadow-lg">
              <Picker onEmojiClick={(emoji) => setDescription((prev) => prev + emoji.emoji)} />
            </div>
          )}
        </div>

        {/* Price + Category */}
        <div className="flex gap-3">
          <input
            type="number"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="flex-1 border rounded-xl p-3"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 border rounded-xl p-3"
          >
            <option value="">Category</option>
            <option value="cars">Cars</option>
            <option value="tech">Tech</option>
            <option value="fashion">Fashion</option>
            <option value="collectibles">Collectibles</option>
          </select>
        </div>

        {/* Common Tags */}
        <div className="flex flex-wrap gap-2">
          {commonTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagClick(tag)}
              className="px-3 py-1 rounded-full bg-gray-200 text-sm"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Tag Input */}
        <input
          className="w-full border rounded-xl p-3"
          placeholder="#tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />

        {/* Music Picker */}
        <div>
          <p className="font-semibold mb-1">Audio</p>
          <select
            value={selectedTrack?.file || ""}
            onChange={(e) => setSelectedTrack(commonTracks.find((t) => t.file === e.target.value))}
            className="w-full border rounded-xl p-3"
          >
            <option value="">None</option>
            {commonTracks.map((track) => (
              <option key={track.file} value={track.file}>
                {track.name}
              </option>
            ))}
          </select>
        </div>

        {message && <p className="text-center text-gray-500 text-sm">{message}</p>}
      </div>
    </main>
  );
}
