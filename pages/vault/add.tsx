import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { uploadImage } from "@/lib/uploadImage";
import { useRouter } from "next/router";
import { useAuthRedirect } from "@/lib/useAuth";
import CameraScanner from "@/components/vault/CameraScanner"; // Import the scanner
import { 
  ArrowLeft, ShieldCheck, Plus, X, Loader2, Zap, Info, Edit3, Camera
} from "lucide-react";

export default function SecureAssetPage() {
  const session = useAuthRedirect(true);
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState("");
  const [sku, setSku] = useState(""); 
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Luxury");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [isManual, setIsManual] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false); // NEW: Controls camera visibility

  const categories = ["Luxury", "Tech", "Sneakers", "Collectibles", "Art"];

  // Handle file from standard upload OR camera
  const handleFileProcess = (file: File) => {
    setImageFiles([file]);
    if (!isManual) {
      handleScan(file);
    }
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files[0]) handleFileProcess(files[0]);
  };

  const removeImage = () => {
    setImageFiles([]);
    setScanResult(null);
  };

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

  const handleSecureAsset = async () => {
    if (!title || imageFiles.length === 0) return;
    setLoading(true);
    setStatus("Uploading to encrypted storage...");

    try {
      const imageUrl = await uploadImage(imageFiles[0]);
      const { data: item, error } = await supabase
        .from("items")
        .insert([{
            title,
            sku: sku.toUpperCase(),
            description,
            image_url: imageUrl,
            category,
            user_id: session?.user.id,
            status: 'secured',
            condition_score: scanResult?.conditionScore || 1.0
        }])
        .select()
        .single();

      if (error) throw error;

      // Pulse Event
      await supabase.from('feed_events').insert({
        type: 'VAULT_ADD',
        user_id: session?.user.id,
        title: `Asset Secured`,
        description: `added ${title} to their private vault.`,
        metadata: { item_id: item.id, sku: sku.toUpperCase(), image_url: imageUrl }
      });

      router.push(`/vault`);
    } catch (err) {
      setStatus("Security Breach: Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <main className="bg-[#F9FAFB] min-h-screen flex flex-col pb-12">
      {/* Logic to show Camera Overlay */}
      {showScanner && (
        <CameraScanner 
          onCapture={(file) => {
            handleFileProcess(file);
            setShowScanner(false);
          }} 
          onClose={() => setShowScanner(false)} 
        />
      )}

      {/* Header */}
      <nav className="bg-white border-b border-gray-100 p-4 sticky top-0 z-30 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2"><ArrowLeft size={20} /></button>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Vault Entry</p>
          <h1 className="text-xs font-bold font-mono uppercase">NEW_ASSET_SECURE</h1>
        </div>
        <div className="w-10" />
      </nav>

      <div className="max-w-md mx-auto w-full p-6 space-y-6">
        {/* Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button onClick={() => setIsManual(false)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl ${!isManual ? 'bg-white shadow-sm' : 'text-gray-400'}`}>
            AI Google Scan
          </button>
          <button onClick={() => setIsManual(true)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl ${isManual ? 'bg-white shadow-sm' : 'text-gray-400'}`}>
            Manual Secure
          </button>
        </div>

        {/* Camera / Upload Trigger */}
        <section>
          <div className="relative aspect-square rounded-[32px] overflow-hidden bg-white border-2 border-dashed border-gray-200">
            {imageFiles.length > 0 ? (
              <div className="relative w-full h-full">
                <img src={URL.createObjectURL(imageFiles[0])} className="object-contain w-full h-full p-8" />
                <button onClick={removeImage} className="absolute top-4 right-4 bg-black text-white p-2 rounded-full"><X size={16} /></button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                {/* Two options: Click for Camera, or tiny text for file upload */}
                <button 
                  onClick={() => setShowScanner(true)}
                  className="w-16 h-16 bg-black rounded-full flex items-center justify-center mb-4 hover:scale-110 transition-transform shadow-lg"
                >
                  <Camera size={24} className="text-white" />
                </button>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tap to Scan</span>
                
                {/* Fallback for upload */}
                <label className="mt-4 text-[9px] font-bold text-blue-500 uppercase cursor-pointer">
                  or upload file
                  <input type="file" accept="image/*" className="hidden" onChange={handleFilesChange} />
                </label>
              </div>
            )}
          </div>
        </section>

        {/* Scan Results & Inputs */}
        {scanResult && !isManual && (
          <div className="p-4 bg-white border border-gray-100 rounded-3xl shadow-sm">
             <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-gray-400">Oracle Confidence</span>
                <span className="text-2xl font-black italic">{(scanResult.conditionScore * 10).toFixed(1)}/10</span>
             </div>
          </div>
        )}

        <div className="space-y-4">
          <input className="w-full bg-white border border-gray-100 rounded-2xl p-4 font-bold" placeholder="Asset Name" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
             <input className="w-full bg-white border border-gray-100 rounded-2xl p-4 font-mono text-sm uppercase" placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
             <select className="w-full bg-white border border-gray-100 rounded-2xl p-4 font-bold text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
          </div>
        </div>

        <button onClick={handleSecureAsset} disabled={loading || !title} className="w-full bg-black text-white py-5 rounded-[24px] font-black uppercase tracking-widest text-xs disabled:opacity-50">
           {loading ? <Loader2 className="animate-spin mx-auto" /> : "Secure in Vault"}
        </button>
      </div>
    </main>
  );
}
