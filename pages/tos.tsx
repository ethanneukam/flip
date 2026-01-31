import ComplianceModal from "@/components/ComplianceModal";
import { useRouter } from "next/router";

export default function TOSPreview() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-white font-mono text-xs uppercase tracking-[0.5em] opacity-50">
          Preview_Mode // Protocol_v3
        </h1>
      </div>
      
      {/* We pass a dummy ID just to see the UI */}
      <ComplianceModal 
        userId="preview-mode" 
        onComplete={() => alert("Verification Simulation Complete")} 
      />
      
      <p className="mt-8 text-zinc-600 font-mono text-[10px] uppercase">
        Press ESC or use the buttons to interact with the logic.
      </p>
    </div>
  );
}
