// pages/upload.js
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { uploadImage } from "../lib/uploadImage";
import { useRouter } from "next/router";
import { useAuthRedirect } from "../lib/useAuth";
import dynamic from "next/dynamic";

// Emoji Picker (lazy load to avoid SSR issues)
const Picker = dynamic(() => import("emoji-picker-react"), { ssr: false });

export default function UploadPage() {
  const session = useAuthRedirect(true); // requires login
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
  const descRef = useRef(null);
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
    const intervalTime = (duration * step) / 1;
    fadeInterval.current = setInterval(() => {
      if (audio.volume < 1) audio.volume = Math.min(audio.volume + step, 1);
      else clearInterval(fadeInterval.current);
    }, intervalTime);
  };

  const fadeOut = (audio, duration = 1000) => {
    if (!audio) return;
    const step = 0.05;
    const intervalTime = (duration * step) / 1;
    fadeInterval.current = setInterval(() => {
      if (audio.volume > 0) audio.volume = Math.max(audio.volume - step, 0);
      else {
        clearInterval(fadeInterval.current);
        audio.pause();
        audio.currentTime = 0;
      }
    }, intervalTime);
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setCurrentSession(newSession);
        if (!newSession) router.push("/auth");
      }
    );
    return () => authListener.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!audioRef.current) return;

    if (selectedTrack) fadeIn(audioRef.current, 800);
    else fadeOut(audioRef.current, 800);

    return () => clearInterval(fadeInterval.current);
  }, [selectedTrack]);

  if (!currentSession) return <p>Loading...</p>;

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles((prev) => [...prev, ...files].slice(0, 4));
  };

  const removeImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveImage = (index, direction) => {
    if (direction === "left" && index === 0) return;
    if (direction === "right" && index === imageFiles.length - 1) return;
    const newFiles = [...imageFiles];
    const swapIndex = direction === "left" ? index - 1 : index + 1;
    [newFiles[index], newFiles[swapIndex]] = [newFiles[swapIndex], newFiles[index]];
    setImageFiles(newFiles);
  };

  const addEmoji = (emojiObj) => setDescription((prev) => prev + emojiObj.emoji);

  const handleTagClick = (tag) => {
    const currentTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (!currentTags.includes(tag)) setTags((prev) => (prev ? prev + ", " + tag : tag));
  };

  const scrollToImage = (index) => {
    if (!carouselRef.current) return;
    const width = carouselRef.current.offsetWidth;
    carouselRef.current.scrollTo({ left: width * index, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

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
      setMessage("Item uploaded successfully!");
      setTitle(""); setPrice(""); setDescription(""); setCategory("");
      setTags(""); setImageFiles([]); setSelectedTrack(null);
    }
    setLoading(false);
  };

  return (
    <main className="bg-gray-50 min-h-screen">
      {/* Sticky header */}
      <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-20">
        <button onClick={() => router.back()} className="text-gray-500 font-semibold">Cancel</button>
        <h2 className="text-lg font-bold">Create Post</h2>
        <button
          onClick={handleSubmit}
          disabled={!title && imageFiles.length === 0}
          className="text-blue-600 font-semibold disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>

      <form className="space-y-4 p-4 max-w-md mx-auto">
        {/* Image upload & carousel */}
        <div className="relative mb-4 flex gap-2 overflow-x-auto" ref={carouselRef}>
          {imageFiles.map((file, index) => (
            <div key={index} className="relative group">
              <img src={URL.createObjectURL(file)} className="w-32 h-32 rounded-2xl object-cover transition-opacity duration-500 hover:opacity-80"/>
              <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-black bg-opacity-40 text-white rounded-full p-1">×</button>
              <div className="absolute bottom-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button type="button" onClick={() => moveImage(index, "left")} className="bg-gray-200 px-1 rounded">←</button>
                <button type="button" onClick={() => moveImage(index, "right")} className="bg-gray-200 px-1 rounded">→</button>
              </div>
            </div>
          ))}
          {imageFiles.length < 4 && (
            <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-blue-500 transition">
              <span className="text-gray-400 text-2xl">+</span>
              <input type="file" accept="image/*" className="hidden" multiple onChange={handleFilesChange} />
            </label>
          )}
        </div>

        {/* Image dots */}
        {imageFiles.length > 1 && (
          <div className="flex justify-center gap-2">
            {imageFiles.map((_, idx) => (
              <button key={idx} type="button" onClick={() => scrollToImage(idx)} className="w-2 h-2 rounded-full bg-gray-400"/>
            ))}
          </div>
        )}

        {/* Title & Description */}
        <input className="w-full border-b text-lg font-semibold p-2 focus:outline-none focus:border-blue-500" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required/>
        <div className="relative">
          <textarea ref={descRef} className="w-full border-b p-2 focus:outline-none focus:border-blue-500 rounded-md resize-none" placeholder="Describe your item..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4}/>
          <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="absolute right-2 bottom-2 text-2xl">😊</button>
          <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/300</p>
          {showEmojiPicker && (<div className="absolute z-50"><Picker onEmojiClick={addEmoji}/></div>)}
        </div>

        {/* Price & Category */}
        <div className="flex gap-3 mb-4">
          <input type="number" step="0.01" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} className="flex-1 border rounded px-3 py-2 focus:outline-none focus:border-blue-500"/>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="flex-1 border rounded px-3 py-2 focus:outline-none focus:border-blue-500">
            <option value="">Category</option>
            <option value="cars">Cars</option>
            <option value="tech">Tech</option>
            <option value="fashion">Fashion</option>
            <option value="collectibles">Collectibles</option>
          </select>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-2">
          {commonTags.map((tag) => (
            <button type="button" key={tag} onClick={() => handleTagClick(tag)} className="bg-gray-200 px-2 py-1 rounded-full text-sm hover:bg-blue-200 transition">{tag}</button>
          ))}
        </div>
        <input className="w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500" placeholder="#tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)}/>

        {/* Music picker */}
        <div className="mt-4">
          <label className="block mb-1 font-semibold">Background Music</label>
          <select value={selectedTrack?.file || ""} onChange={(e) => setSelectedTrack(commonTracks.find((t) => t.file === e.target.value))} className="w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500">
            <option value="">No music</option>
            {commonTracks.map((track) => (<option key={track.file} value={track.file}>{track.name}</option>))}
          </select>
        </div>

        {message && <p className="text-center text-gray-600 mt-2">{message}</p>}
      </form>

      {/* Audio playback */}
      {selectedTrack && <audio ref={audioRef} src={selectedTrack.file} loop autoPlay />}

      {/* Bottom Post button */}
      <div className="fixed bottom-4 left-4 right-4 z-10">
        <button onClick={handleSubmit} disabled={(!title && imageFiles.length === 0) || loading} className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl shadow-lg disabled:opacity-50">
          {loading ? "Posting..." : "Post"}
        </button>
      </div>
{/* --- Live Post Preview --- */}
{(title || description || imageFiles.length > 0 || tags) && (
  <div className="mt-6 max-w-md mx-auto p-4 border rounded-xl bg-white shadow-lg">
    <h3 className="font-bold text-lg mb-2">Live Preview</h3>

    {/* Image carousel */}
    <div className="relative mb-4 flex gap-2 overflow-x-auto">
      {imageFiles.map((file, index) => (
        <div key={index} className="relative">
          <img
            src={URL.createObjectURL(file)}
            className="w-32 h-32 rounded-2xl object-cover transition-opacity duration-500 hover:opacity-80"
          />
        </div>
      ))}
    </div>

    {/* Title */}
    {title && <h4 className="font-semibold text-md mb-1">{title}</h4>}

    {/* Description */}
    {description && <p className="text-gray-700 mb-2">{description}</p>}

    {/* Tags */}
    {tags && (
      <div className="flex flex-wrap gap-2">
        {tags.split(",").map((tag, i) => (
          <span key={i} className="bg-gray-200 px-2 py-1 rounded-full text-sm">{tag.trim()}</span>
        ))}
      </div>
    )}

    {/* Music playback in preview */}
    {selectedTrack && (
      <audio
        ref={audioRef}
        src={selectedTrack.file}
        loop
        autoPlay
        className="mt-2 w-full"
      />
    )}
  </div>
)}

    </main>
  );
}