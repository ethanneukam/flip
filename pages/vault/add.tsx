// pages/vault/add.tsx
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { uploadImage } from "@/lib/uploadImage";
import { useRouter } from "next/router";
import { useAuthRedirect } from "@/lib/useAuth";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Image as ImageIcon, 
  Plus, 
  X, 
  Loader2, 
  Zap 
} from "lucide-react";

export default function SecureAssetPage() {
  const session = useAuthRedirect(true);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [sku, setSku] = useState(""); // Critical for Oracle lookup
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Luxury");
  const [imageFiles, setImageFiles] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const categories = ["Luxury", "Tech", "Sneakers", "Collectibles", "Art"];

  // Handle Image Selection
  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles((prev) => [...prev, ...files].slice(0, 1)); // Restricting to 1 primary for Oracle consistency
  };

  const removeImage = () => setImageFiles([]);

  // --- THE SECURE LOGIC ---
  const handleSecureAsset = async (e) => {
    e.preventDefault();
    if (!title || imageFiles.length === 0) return;
    
    setLoading(true);
    setStatus("Uploading to encrypted storage...");

    try {
      // 1. Upload Image
      const imageUrl = await uploadImage(imageFiles[0]);
      if (!imageUrl) throw new Error("Storage upload failed");

      // 2. Insert into 'items' (The Vault)
      const { data: item, error: itemError } = await supabase
        .from("items")
        .insert([
          {
            title,
            sku: sku.toUpperCase(),
            description,
            image_url: imageUrl,
            category,
            user_id: session.user.id,
            status: 'secured'
          },
        ])
        .select()
        .single();

      if (itemError) throw itemError;

      // 3. Post to Pulse Feed (The Social Logic)
      setStatus("Broadcasting to Pulse...");
      await supabase.from('feed_events').insert({
        type: 'VAULT_ADD',
        user_id: session.user.id,
        title: `Asset Secured`,
        description: `added ${title} to their private vault.`,
        metadata: {
          item_id: item.id,
          sku: sku.toUpperCase(),
          image_url: imageUrl,
          category: category
        }
      });

      // 4. Award FlipCoins (Engagement)
      await fetch("/api/coins/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: session.user.id,
          amount: 5,
          reason: "Vault Security Bonus",
          related_id: item.id,
        }),
      });

      setStatus("Asset Secured!");
      setTimeout(() => router.push(`/item/${item.id}`), 1000);

    } catch (err) {
      console.error(err);
      setStatus("Security Breach: Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <main className="bg-[#F9FAFB] min-h-screen flex flex-col">
      {/* High-Contrast Header */}
      <nav className="bg-white border-b border-gray-100 p-4 sticky top-0 z-30 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 leading-none mb-1">Vault Entry</p>
          <h1 className="text-xs font-bold text-black font-mono tracking-widest">NEW_ASSET_SECURE</h1>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </nav>

      <div className="max-w-md mx-auto w-full p-6 space-y-8">
        
        {/* 1. Image Upload Area (Vault Identity) */}
        <section>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 block">Primary Asset View</label>
          <div className="relative aspect-square rounded-[32px] overflow-hidden bg-white border-2 border-dashed border-gray-200 hover:border-black transition-colors group">
            {imageFiles.length > 0 ? (
              <div className="relative w-full h-full">
                <img
                  src={URL.createObjectURL(imageFiles[0])}
                  className="object-contain w-full h-full p-8"
                />
                <button
                  onClick={removeImage}
                  className="absolute top-4 right-4 bg-black text-white p-2 rounded-full shadow-xl hover:scale-110 transition-transform"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Plus size={24} className="text-gray-400" />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Upload Proof</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFilesChange} />
              </label>
            )}
          </div>
        </section>

        {/* 2. Asset Metadata */}
        <section className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Asset Name</label>
            <input
              className="w-full bg-white border border-gray-100 rounded-2xl p-4 font-bold text-lg focus:ring-2 focus:ring-black outline-none transition-all"
              placeholder="e.g. Rolex Submariner"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">SKU / ID</label>
              <input
                className="w-full bg-white border border-gray-100 rounded-2xl p-4 font-mono text-sm focus:ring-2 focus:ring-black outline-none transition-all uppercase"
                placeholder="126610LN"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Index Category</label>
              <select
                className="w-full bg-white border border-gray-100 rounded-2xl p-4 font-bold text-sm appearance-none focus:ring-2 focus:ring-black outline-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Historical Notes</label>
            <textarea
              className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-sm font-medium h-32 resize-none focus:ring-2 focus:ring-black outline-none transition-all"
              placeholder="Provenance details, condition, or acquisition source..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </section>

        {/* 3. Status and Action */}
        <div className="pt-4">
          <p className="text-center text-[10px] font-bold text-gray-400 uppercase mb-4 tracking-tighter">
            {status || "Ready for vault encryption"}
          </p>
          <button
            onClick={handleSecureAsset}
            disabled={loading || !title || imageFiles.length === 0}
            className="w-full bg-black text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center space-x-3 disabled:opacity-20 active:scale-[0.98] transition-all shadow-2xl"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <ShieldCheck size={18} className="text-blue-400" />
                <span>Secure in Vault</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Decorative Oracle Background Element */}
      <div className="fixed bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-white to-transparent pointer-events-none -z-10" />
    </main>
  );
}
