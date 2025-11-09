// pages/edit-profile.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import BottomNav from "../components/BottomNav";

export default function EditProfilePage() {
  const [profile, setProfile] = useState({
    username: "",
    avatar_url: "",
    bio: "",
    instagram: "",
    tiktok: "",
    youtube: "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("username, avatar_url, bio, instagram, tiktok, youtube")
      .eq("id", user.id)
      .single();

    if (error) console.error(error);
    else setProfile(data);
  };

  const handleSave = async () => {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const updates = {
      id: user.id,
      username: profile.username,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      instagram: profile.instagram,
      tiktok: profile.tiktok,
      youtube: profile.youtube,
      updated_at: new Date(),
    };

    const { error } = await supabase.from("profiles").upsert(updates);
    if (error) alert(error.message);
    else router.push("/profile");

    setSaving(false);
  };

  const uploadAvatar = async (event: any) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

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
    <main className="max-w-md mx-auto p-6 pb-24 space-y-6">
      <h1 className="text-2xl font-bold text-center mb-6">Edit Profile</h1>

      <div className="flex flex-col items-center space-y-3">
        <div className="relative">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="avatar"
              className="w-28 h-28 rounded-full object-cover border-4 border-gray-200 shadow"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-gray-200" />
          )}
          <label className="absolute bottom-0 right-0 bg-blue-600 text-white px-2 py-1 text-xs rounded cursor-pointer">
            {uploading ? "..." : "Edit"}
            <input
              type="file"
              className="hidden"
              onChange={uploadAvatar}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-600">Username</label>
          <Input
            value={profile.username || ""}
            onChange={(e) =>
              setProfile((prev) => ({ ...prev, username: e.target.value }))
            }
            placeholder="Username"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Bio</label>
          <Textarea
            value={profile.bio || ""}
            onChange={(e) =>
              setProfile((prev) => ({ ...prev, bio: e.target.value }))
            }
            placeholder="Write something about yourself..."
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Instagram</label>
          <Input
            value={profile.instagram || ""}
            onChange={(e) =>
              setProfile((prev) => ({ ...prev, instagram: e.target.value }))
            }
            placeholder="@username"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">TikTok</label>
          <Input
            value={profile.tiktok || ""}
            onChange={(e) =>
              setProfile((prev) => ({ ...prev, tiktok: e.target.value }))
            }
            placeholder="@username"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">YouTube</label>
          <Input
            value={profile.youtube || ""}
            onChange={(e) =>
              setProfile((prev) => ({ ...prev, youtube: e.target.value }))
            }
            placeholder="Channel or handle"
          />
        </div>
      </div>

      <div className="pt-4">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="text-center">
        <Button
          variant="outline"
          className="mt-3 text-gray-700"
          onClick={() => router.push("/profile")}
        >
          Cancel
        </Button>
      </div>

      <BottomNav />
    </main>
  );
}