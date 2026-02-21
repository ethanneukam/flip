"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomNav from "../components/BottomNav";
import { User, Save, ChevronLeft, Loader2 } from "lucide-react";

export default function EditProfilePage() {
  const [profile, setProfile] = useState({ username: "" });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    if (data) setProfile(data);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .upsert({ 
        id: user.id, 
        username: profile.username, 
        updated_at: new Date() 
      });

    if (error) alert(error.message);
    else router.push("/profile");
    setSaving(false);
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white font-sans pb-24">
      <div className="flex items-center justify-between p-6 max-w-md mx-auto">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-500 hover:text-white transition">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-sm font-bold uppercase tracking-widest">Settings</h1>
        <div className="w-10" />
      </div>

      <div className="max-w-md mx-auto px-8 pt-4 space-y-12">
        {/* Profile Icon Header (Non-editable) */}
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full border-2 border-white/10 bg-white/5 flex items-center justify-center">
            <User size={32} className="text-gray-700" />
          </div>
          <p className="text-[10px] text-gray-600 uppercase tracking-[0.2em] mt-4">Account Identity</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Username</label>
            <Input
              className="bg-white/5 border-white/10 text-white rounded-2xl h-14 px-6 focus:ring-blue-500 focus:border-blue-500"
              value={profile.username || ""}
              onChange={(e) => setProfile({ username: e.target.value })}
              placeholder="Your handle"
            />
          </div>
        </div>

        <div className="pt-8">
          <Button
            className="w-full bg-white text-black hover:bg-gray-200 h-14 rounded-2xl font-bold text-sm transition-all active:scale-95 flex gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={18} />}
            {saving ? "Updating..." : "Save Changes"}
          </Button>
          
          <button 
            onClick={() => router.push("/profile")}
            className="w-full text-xs text-gray-600 font-medium py-6 hover:text-gray-400"
          >
            Discard changes
          </button>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
