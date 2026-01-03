"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomNav from "../components/BottomNav";
import { Camera, User, Save, ChevronLeft, Loader2 } from "lucide-react";

export default function EditProfilePage() {
  const [profile, setProfile] = useState({ username: "", avatar_url: "" });
  const [uploading, setUploading] = useState(false);
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
      .select("username, avatar_url")
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
      .upsert({ id: user.id, ...profile, updated_at: new Date() });

    if (error) alert(error.message);
    else router.push("/profile");
    setSaving(false);
  };

  const uploadAvatar = async (event: any) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split(".").pop();
      const filePath = `${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setProfile((prev) => ({ ...prev, avatar_url: data.publicUrl }));
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white font-sans pb-24">
      {/* Simple Top Nav */}
      <div className="flex items-center justify-between p-6 max-w-md mx-auto">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-500 hover:text-white transition">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-sm font-bold uppercase tracking-widest">Settings</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="max-w-md mx-auto px-8 pt-4 space-y-12">
        {/* Minimal Avatar Picker */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/10 bg-white/5 flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-gray-700" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-blue-600 p-2.5 rounded-full cursor-pointer shadow-lg hover:bg-blue-500 transition-colors">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              <input type="file" className="hidden" onChange={uploadAvatar} disabled={uploading} accept="image/*" />
            </label>
          </div>
        </div>

        {/* Essential Fields Only */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Username</label>
            <Input
              className="bg-white/5 border-white/10 text-white rounded-2xl h-14 px-6 focus:ring-blue-500 focus:border-blue-500"
              value={profile.username || ""}
              onChange={(e) => setProfile((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="Your handle"
            />
          </div>
        </div>

        {/* Primary Action */}
        <div className="pt-8">
          <Button
            className="w-full bg-white text-black hover:bg-gray-200 h-14 rounded-2xl font-bold text-sm transition-all active:scale-95 flex gap-2"
            onClick={handleSave}
            disabled={saving || uploading}
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