"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import { User, Camera, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";

const MAX_SIZE = 150 * 1024;
const MAX_DIM = 256;

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const r = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * r);
        height = Math.round(height * r);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas error"));
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.9;
      const tryEncode = () => {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        if (dataUrl.length > MAX_SIZE && quality > 0.3) {
          quality -= 0.1;
          tryEncode();
        } else {
          resolve(dataUrl);
        }
      };
      tryEncode();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, etc.)");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const avatar = await resizeImage(file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const handleRemove = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove");
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <PageHeader
        icon={User}
        title="Profile"
        subtitle="Manage your account and profile picture"
      />

      <div className="max-w-md">
        <div className="glass-card rounded-2xl p-6 border border-glass-border">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-space-800 border-2 border-glass-border flex items-center justify-center">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.username}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <User className="w-12 h-12 text-space-500" />
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={busy}
                  className="hidden"
                />
                <Camera className="w-8 h-8 text-white" />
              </label>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-semibold text-space-200">{user.username}</h2>
              <p className="text-sm text-space-500 mt-0.5">
                {(user.roles ?? [user.role ?? "viewer"]).map((r) =>
                  ({ admin: "Admin", logistics: "Logistics", ops: "Ops", raffle: "Raffle", viewer: "Viewer" }[r] || r)
                ).join(", ")}
              </p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
                <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-holo/10 border border-holo/30 text-holo text-sm font-medium hover:bg-holo/20 transition-colors cursor-pointer">
                  <Camera className="w-4 h-4" />
                  {busy ? "Uploading..." : "Change photo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={busy}
                    className="hidden"
                  />
                </label>
                {user.avatarUrl && (
                  <button
                    onClick={handleRemove}
                    disabled={busy}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-space-800/50 border border-glass-border text-space-400 hover:text-danger hover:border-danger/30 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-danger">{error}</p>
          )}

          <p className="mt-4 text-xs text-space-500">
            Recommended: square image, max 256×256. Images are compressed to stay under 150KB.
          </p>
        </div>
      </div>
    </>
  );
}
