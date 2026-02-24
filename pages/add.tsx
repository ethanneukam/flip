import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { uploadImage } from "@/lib/uploadImage";
import { useRouter } from "next/router";
import { useAuthRedirect } from "@/lib/useAuth";
import CameraScanner from "@/components/vault/CameraScanner";
import { 
  ArrowLeft, X, Loader2, Camera, Crosshair, ShieldAlert
} from "lucide-react";

export default function SecureAssetPage() {
  const session = useAuthRedirect(true);
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState("");
  const [sku, setSku] = useState(""); 
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Tech");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null); // FIX: Prevent double uploads
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("AWAITING_INPUT...");
  const [isManual, setIsManual] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);

  const categories = ["Luxury", "Tech", "Sneakers", "Collectibles", "Art"];

  const handleFileProcess = (file: File) => {
    setImageFiles([file]);
    setUploadedImageUrl(null); // Reset URL on new file
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
    setUploadedImageUrl(null);
    setTitle("");
    setSku("");
    setStatus("AWAITING_INPUT...");
  };

  const handleScan = async (file: File) => {
    setLoading(true);
    setStatus("AI_VISION_ANALYSIS_ACTIVE...");
    try {
      // 1. Upload once and save the URL in state so we don't upload again later
      const url = await uploadImage(file);
      setUploadedImageUrl(url);

      // 2. Ping Google Vision API
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url })
      });
      
      if (!res.ok) throw new Error("Vision API Failed");
      const data = await res.json();

      setScanResult(data);
      setTitle(data.suggestion || "");
      setSku(data.probableSku || "");
      setStatus("SCAN_COMPLETE :: VERIFY_DATA");
    } catch (err) {
      console.error(err);
      setStatus("ERR_SCAN_FAILED :: MANUAL_ENTRY_REQUIRED");
    } finally {
      setLoading(false);
    }
  };

  const handleSecureAsset = async () => {
    if (!title || imageFiles.length === 0) return;
    setLoading(true);
    setStatus("UPLOADING_TO_ENCRYPTED_VAULT...");

    try {
      // FIX: Only upload if we haven't already uploaded during the AI scan
      let finalUrl = uploadedImageUrl;
      if (!finalUrl) {
        finalUrl = await uploadImage(imageFiles[0]);
      }

      // Insert into Vault
      const { data: item, error } = await supabase
        .from("items")
        .insert([{
            title,
            sku: sku.toUpperCase(),
            description,
            image_url: finalUrl,
            category,
            user_id: session?.user.id,
            status: 'secured',
            condition_score: scanResult?.conditionScore || 1.0
        }])
        .select()
        .single();

      if (error) throw error;

      // Pulse Event to Feed
      await supabase.from('feed_events').insert({
        type: 'VAULT_ADD',
        user_id: session?.user.id,
        title: `Asset Secured`,
        description: `added ${title} to their private vault.`,
        metadata: { item_id: item.id, sku: sku.toUpperCase(), image_url: finalUrl }
      });

      router.push(`/vault`);
    } catch (err) {
      console.error(err);
      setStatus("SECURITY_BREACH :: DB_INSERT_FAILED");
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <main className="bg-black text-green-500 font-mono min-h-screen flex flex-col pb-12 selection:bg-green-500 selection:text-black">
      {/* Scanner Overlay */}
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
      <nav className="border-b border-green-500/20 bg-black/80 backdrop-blur-md p-4 sticky top-0 z-30 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 hover:text-white transition-colors"><ArrowLeft size={20} /></button>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Vault Entry</p>
          <h1 className="text-xs font-bold uppercase tracking-wider">NEW_ASSET_SECURE</h1>
        </div>
        <div className="w-10 flex justify-end">
          <ShieldAlert size={16} className={loading ? "animate-pulse text-green-400" : "text-green-800"} />
        </div>
      </nav>

      <div className="max-w-md mx-auto w-full p-6 space-y-6">
        
        {/* Terminal Status Output */}
        <div className="bg-zinc-950 border border-green-500/20 rounded-sm p-3 shadow-[0_0_15px_rgba(34,197,94,0.05)]">
          <p className="text-[10px] uppercase text-green-600 mb-1">System.Status</p>
          <p className={`text-xs ${status.includes("ERR") ? "text-red-500" : "text-green-400"} animate-pulse`}>
            {status}
          </p>
        </div>

        {/* Scan Mode Toggle */}
        <div className="flex bg-zinc-900 border border-green-500/20 p-1 rounded-sm">
          <button onClick={() => setIsManual(false)} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider ${!isManual ? 'bg-green-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'text-green-700 hover:text-green-400'}`}>
            Auto-Vision
          </button>
          <button onClick={() => setIsManual(true)} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider ${isManual ? 'bg-green-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'text-green-700 hover:text-green-400'}`}>
            Manual Override
          </button>
        </div>

        {/* Camera / Upload Area */}
        <section>
          <div className="relative aspect-square rounded-sm overflow-hidden bg-zinc-950 border-2 border-dashed border-green-500/30 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)]">
            {imageFiles.length > 0 ? (
              <div className="relative w-full h-full group">
                <img src={URL.createObjectURL(imageFiles[0])} className="object-cover w-full h-full opacity-70 mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-500" />
                {/* Scanline overlay effect */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
                <button onClick={removeImage} className="absolute top-4 right-4 bg-black/80 border border-green-500 text-green-500 hover:bg-green-500 hover:text-black p-2 rounded-sm backdrop-blur-sm transition-all"><X size={16} /></button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                <button 
                  onClick={() => setShowScanner(true)}
                  className="w-20 h-20 bg-zinc-900 border border-green-500/50 rounded-sm flex items-center justify-center hover:bg-green-950 hover:border-green-400 transition-all shadow-[0_0_15px_rgba(34,197,94,0.1)] group"
                >
                  <Crosshair size={32} className="text-green-600 group-hover:text-green-400" />
                </button>
                <span className="text-[10px] font-black uppercase tracking-widest text-green-600">Initialize Camera</span>
                
                <label className="text-[9px] font-bold text-green-700 hover:text-green-400 uppercase cursor-pointer border-b border-dashed border-green-700/50 pb-1">
                  [ Or Upload Local File ]
                  <input type="file" accept="image/*" className="hidden" onChange={handleFilesChange} />
                </label>
              </div>
            )}
          </div>
        </section>

        {/* Scan Results Meta */}
        {scanResult && !isManual && (
          <div className="p-3 bg-zinc-900 border border-green-500/30 rounded-sm flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-green-600">Confidence_Matrix</span>
            <span className="text-lg font-black text-green-400">{(scanResult.conditionScore * 10).toFixed(1)}/10</span>
          </div>
        )}

        {/* Data Inputs */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-widest text-green-700">Asset.Designation</label>
            <input className="w-full bg-zinc-950 border border-green-500/20 focus:border-green-400 text-green-400 placeholder-green-800 rounded-sm p-3 font-bold text-sm outline-none transition-all" placeholder="e.g. Rolex Submariner" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-green-700">Serial/SKU</label>
              <input className="w-full bg-zinc-950 border border-green-500/20 focus:border-green-400 text-green-400 placeholder-green-800 rounded-sm p-3 font-mono text-sm uppercase outline-none transition-all" placeholder="OPTIONAL" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-green-700">Class</label>
              <select className="w-full bg-zinc-950 border border-green-500/20 focus:border-green-400 text-green-400 rounded-sm p-3 font-bold text-sm outline-none transition-all appearance-none" value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map(c => <option key={c} value={c} className="bg-black text-green-500">{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <button 
          onClick={handleSecureAsset} 
          disabled={loading || !title || imageFiles.length === 0} 
          className="w-full bg-green-500 hover:bg-green-400 text-black py-4 rounded-sm font-black uppercase tracking-widest text-xs disabled:opacity-30 disabled:hover:bg-green-500 transition-all shadow-[0_0_20px_rgba(34,197,94,0.2)]"
        >
           {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : "[ Execute Vault Insert ]"}
        </button>
      </div>
    </main>
  );
}