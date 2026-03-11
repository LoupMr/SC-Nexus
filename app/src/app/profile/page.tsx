"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { User, Camera, Trash2, ImageIcon, Sun, Moon, KeyRound, Copy, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { useBackground } from "@/context/useBackground";
import { useTheme } from "@/context/ThemeContext";
import PageHeader from "@/components/PageHeader";

const MAX_SIZE = 150 * 1024;
const MAX_DIM = 256;
const BG_MAX_DIM = 2560;
const BG_MAX_SIZE = 1200 * 1024;

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
      const tryEncode = (iter = 0) => {
        if (iter > 10) return resolve(canvas.toDataURL("image/jpeg", 0.3));
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        if (dataUrl.length > MAX_SIZE && quality > 0.3) {
          quality -= 0.1;
          tryEncode(iter + 1);
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

function resizeBackgroundImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > BG_MAX_DIM || height > BG_MAX_DIM) {
        const r = Math.min(BG_MAX_DIM / width, BG_MAX_DIM / height);
        width = Math.round(width * r);
        height = Math.round(height * r);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas error"));
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.92;
      const tryEncode = (iter = 0) => {
        if (iter > 15) return resolve(canvas.toDataURL("image/jpeg", 0.3));
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        if (dataUrl.length > BG_MAX_SIZE && quality > 0.3) {
          quality -= 0.08;
          tryEncode(iter + 1);
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
  const { user, refreshUser, isAdmin, passkey, fetchPasskey, regeneratePasskey } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { backgroundUrl, setBackgroundUrl } = useBackground();
  const [busy, setBusy] = useState(false);
  const [bgBusy, setBgBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bgError, setBgError] = useState<string | null>(null);
  const [bgUrlInput, setBgUrlInput] = useState("");
  const [showPasskey, setShowPasskey] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdmin && !passkey) fetchPasskey();
  }, [isAdmin, passkey, fetchPasskey]);

  useEffect(() => {
    if (backgroundUrl?.startsWith("http")) setBgUrlInput(backgroundUrl);
    if (backgroundUrl?.startsWith("data:")) setBgUrlInput("");
  }, [backgroundUrl]);

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

  const copyPasskey = () => {
    if (passkey) {
      navigator.clipboard.writeText(passkey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

        {/* Theme toggle */}
        <div className="glass-card chamfer-md p-6 border border-glass-border mt-6">
          <h3 className="text-sm font-semibold text-space-200 flex items-center gap-2 mb-2 mobiglas-label">
            {theme === "dark" ? <Sun className="w-4 h-4 text-holo" /> : <Moon className="w-4 h-4 text-holo" />}
            Appearance
          </h3>
          <button
            onClick={toggleTheme}
            className="chamfer-sm w-full px-4 py-2.5 bg-space-800/50 border border-glass-border text-space-300 hover:border-holo/30 hover:text-holo transition-all mobiglas-label flex items-center justify-center gap-2"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          </button>
        </div>

        {/* Org Passkey (admins only) */}
        {isAdmin && (
          <div className="glass-card chamfer-md p-6 border border-glass-border mt-6">
            <h3 className="text-sm font-semibold text-space-200 flex items-center gap-2 mb-2 mobiglas-label">
              <KeyRound className="w-4 h-4 text-holo" />
              Org Passkey
            </h3>
            <button
              onClick={() => setShowPasskey(!showPasskey)}
              className="text-xs text-space-400 hover:text-space-300 mobiglas-label"
            >
              {showPasskey ? "Hide" : "Show"} passkey
            </button>
            {showPasskey && passkey && (
              <div className="mt-3 space-y-2">
                <div className="font-mono text-xs text-industrial tracking-widest text-center py-2 bg-space-900/60 chamfer-sm tabular-nums">
                  {passkey}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyPasskey}
                    className="flex-1 chamfer-sm py-1.5 bg-space-900/40 text-space-400 hover:text-space-300 border border-space-700/20 text-[10px] mobiglas-label"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={regeneratePasskey}
                    className="flex-1 chamfer-sm py-1.5 bg-space-900/40 text-space-400 hover:text-space-300 border border-space-700/20 text-[10px] mobiglas-label"
                  >
                    <RefreshCw className="w-3 h-3 inline mr-1" /> New Key
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="glass-card chamfer-md p-6 border border-glass-border mt-6">
          <h3 className="text-sm font-semibold text-space-200 flex items-center gap-2 mb-2 mobiglas-label">
            <ImageIcon className="w-4 h-4 text-holo" />
            Custom Background
          </h3>
          <p className="text-xs text-space-500 mb-4">
            Use a link for full quality, or upload for convenience. The UI stays transparent.
          </p>

          {/* URL input - full quality */}
          <div className="flex gap-2 mb-4">
            <input
              type="url"
              value={bgUrlInput}
              onChange={(e) => setBgUrlInput(e.target.value)}
              placeholder="https://... (full quality)"
              className="flex-1 chamfer-sm px-3 py-2.5 bg-space-900/60 border border-glass-border text-sm text-space-200 placeholder:text-space-600 focus:outline-none focus:border-holo/40 focus:ring-1 focus:ring-holo/20 transition-all"
            />
            <button
              onClick={() => {
                const url = bgUrlInput.trim() || null;
                setBackgroundUrl(url);
                setBgError(null);
              }}
              className="chamfer-sm px-4 py-2.5 bg-holo/20 border border-holo/40 text-holo text-sm font-medium hover:bg-holo/30 transition-all mobiglas-label"
            >
              Apply
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-px bg-glass-border" />
            <span className="text-xs text-space-500 mobiglas-label">or</span>
            <div className="flex-1 h-px bg-glass-border" />
          </div>

          {/* Upload - good quality */}
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {backgroundUrl && (
              <div className="w-full sm:w-32 h-20 chamfer-sm overflow-hidden bg-space-800/60 border border-glass-border flex-shrink-0">
                <img
                  src={backgroundUrl}
                  alt="Background preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 chamfer-sm px-4 py-2.5 bg-space-800/50 border border-glass-border text-space-300 hover:text-holo hover:border-holo/30 text-sm font-medium transition-all cursor-pointer mobiglas-label">
                <Camera className="w-4 h-4" />
                {bgBusy ? "Processing..." : "Upload image"}
                <input
                  ref={bgInputRef}
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith("image/")) {
                      setBgError("Please select an image file (PNG, JPG, etc.)");
                      return;
                    }
                    setBgError(null);
                    setBgBusy(true);
                    try {
                      const dataUrl = await resizeBackgroundImage(file);
                      setBackgroundUrl(dataUrl);
                    } catch (err) {
                      setBgError(err instanceof Error ? err.message : "Failed to process image");
                    } finally {
                      setBgBusy(false);
                      e.target.value = "";
                    }
                  }}
                  disabled={bgBusy}
                  className="hidden"
                />
              </label>
              {backgroundUrl && backgroundUrl !== "/default_BG.jpg" && (
                <button
                  onClick={() => { setBackgroundUrl(null); setBgError(null); setBgUrlInput(""); }}
                  disabled={bgBusy}
                  className="flex items-center gap-2 chamfer-sm px-4 py-2.5 bg-space-800/50 border border-glass-border text-space-400 hover:text-alert hover:border-alert/30 text-sm font-medium transition-all mobiglas-label disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" /> Remove
                </button>
              )}
            </div>
          </div>
          {bgError && <p className="mt-2 text-sm text-alert">{bgError}</p>}
          <p className="mt-3 text-xs text-space-500">
            Link = full quality. Upload = 2560px max, ~1.2MB. Saved to your account — syncs across devices.
          </p>
        </div>
      </div>
    </>
  );
}
