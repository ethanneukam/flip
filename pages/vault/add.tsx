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
  Zap,
  Info,
  Edit3,
  Camera
} from "lucide-react";

export default function SecureAssetPage() {
  const session = useAuthRedirect(true);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [sku, setSku] = useState(""); 
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Luxury");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [isManual, setIsManual] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const categories = ["Luxury", "Tech", "Sneakers", "Collectibles", "Art"];

  // Handle Image Selection
  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const selected = files.slice(0, 1);
    setImageFiles(selected);
    
    // Auto-trigger scan if not in manual mode
    if (!isManual && selected[0]) {
      handleScan(selected[0]);
    }
  };

  const removeImage = () => {
    setImageFiles([]);
    setScanResult(null);
  };

  // AI Scan Logic
  const handleScan = async (file: File) => {
    setLoading(true);
    setStatus("AI Analyzing Asset...");
    
    try {
      const url = await uploadImage(file);
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url })
      });
      const data = await res.json();

      setScanResult(data);
      setTitle(data.suggestion || "");
      setSku(data.probableSku || "");
      setStatus("Scan Complete. Verify details.");
    } catch (err) {
      console.error(err);
      setStatus("Scan failed. Try manual entry.");
    } finally {
      setLoading(false);
    }
  };

  // The Secure Logic
  const handleSecureAsset = async () => {
    if (!title || imageFiles.length === 0) return;
    
    setLoading(true);
    setStatus("Uploading to encrypted storage...");

    try {
      const imageUrl = await uploadImage(imageFiles[0]);
      if (!imageUrl) throw new Error("Storage upload failed");

      // Insert into 'items'
      const { data: item, error: itemError } = await supabase
        .from("items")
        .insert([
          {
            title,
            sku: sku.toUpperCase(),
            description,
            image_url: imageUrl,
            category,
            user_id: session?.user.id,
            status: 'secured',
            condition_score: scanResult?.conditionScore || 1.0
          },
        ])
        .select()
        .single();

      if (itemError) throw itemError;

      // Post to Pulse Feed
      setStatus("Broadcasting to Pulse...");
      await supabase.from('feed_events').insert({
        type: 'VAULT_ADD',
        user_id: session?.user.id,
        title: `Asset Secured`,
        description: `added ${title} to their private vault.`,
        metadata: {
          item_id: item.id,
          sku: sku.toUpperCase(),
          image_url: imageUrl,
          category: category
        }
      });

      // Award FlipCoins
      await fetch("/api/coins/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: session?.user.id,
          amount: 5,
          reason: "Vault Security Bonus",
          related_id: item.id,
        }),
      });

      setStatus("Asset Secured!");
      setTimeout(() => router.push(`/vault`), 1000);

    } catch (err) {
      console.error(err);
      setStatus("Security Breach: Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <main className="bg-[#F9FAFB] min-h-screen flex flex-col pb-12">
      {/* Header */}
      <nav className="bg-white border-b border-gray-100 p-4 sticky top-0 z-30 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 leading-none mb-1">Vault Entry</p>
          <h1 className="text-xs font-bold text-black font-mono tracking-widest">NEW_ASSET_SECURE</h1>
        </div>
        <div className="w-10" />
      </nav>

      <div className="max-w-md mx-auto w-full p-6 space-y-6">
        
        {/* Toggle between AI Scan and Manual */}
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button 
            onClick={() => setIsManual(false)}
            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all flex items-center justify-center space-x-2 ${!isManual ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
          >
            <Zap size={12} /> <span>AI Google Scan</span>
          </button>
          <button 
            onClick={() => setIsManual(true)}
            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all flex items-center justify-center space-x-2 ${isManual ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
          >
            <Edit3 size={12} /> <span>Manual Secure</span>
          </button>
        </div>

        {/* Image Upload Area */}
        <section>
          <div className="relative aspect-square rounded-[32px] overflow-hidden bg-white border-2 border-dashed border-gray-200 hover:border-black transition-colors group">
            {imageFiles.length > 0 ? (
              <div className="relative w-full h-full">
                <img
                  src={URL.createObjectURL(imageFiles[0])}
                  className="object-contain w-full h-full p-8"
                  alt="Asset Preview"
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
                  <Camera size={24} className="text-gray-400" />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center px-4">
                  {isManual ? "Upload Asset Proof" : "Scan Asset for AI ID"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFilesChange} />
              </label>
            )}
          </div>
          {!isManual && !imageFiles.length && (
             <p className="text-center text-[10px] text-gray-400 font-bold uppercase mt-4">
               Point camera at asset labels or serial numbers
             </p>
          )}
        </section>

        {/* Condition Scoring UI (Only if scanned) */}
        {scanResult && !isManual && (
          <div className="p-4 bg-white border border-gray-100 rounded-3xl shadow-sm animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Oracle Inspection</h4>
              <div className="flex items-center space-x-1">
                <div className={`h-2 w-2 rounded-full ${scanResult.conditionScore > 0.8 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-[10px] font-bold uppercase italic text-black">AI Graded</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black italic tracking-tighter">
                  {(scanResult.conditionScore * 10).toFixed(1)}/10
                </p>
                <p className="text-[9px] font-bold text-gray-400 uppercase">Condition Grade</p>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-bold text-red-500">
                  -{((1 - scanResult.conditionScore) * 100).toFixed(0)}%
                </p>
                <p className="text-[9px] font-bold text-gray-400 uppercase">Value Adjustment</p>
              </div>
            </div>

            <div className="mt-4 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-black h-full transition-all duration-1000" 
                style={{ width: `${scanResult.conditionScore * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Manual Info Tip */}
        {isManual && (
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
             <Info size={16} className="text-blue-500 mt-1" />
             <p className="text-[11px] font-medium text-blue-700 leading-relaxed">
               Manual entries are flagged for Oracle verification. Ensure the SKU matches official manufacturer records.
             </p>
          </div>
        )}

        {/* Form Fields */}
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

        {/* Action Button */}
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
      
      <div className="fixed bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-white to-transparent pointer-events-none -z-10" />
    </main>
  );
}
