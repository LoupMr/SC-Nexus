"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import RichTextEditor from "@/components/RichTextEditor";

const inputClass = "w-full px-3 py-2.5 bg-space-900/60 border border-glass-border rounded-xl text-sm text-space-200 placeholder:text-space-600 focus:outline-none focus:border-holo/40 transition-all";

export default function NewGuidePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  const hasContent = (html: string) => {
    if (typeof document === "undefined") return !!html.trim();
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || "").trim().length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !hasContent(content)) return;
    setError(null);
    setBusy(true);
    const res = await fetch("/api/guides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), content, excerpt: excerpt.trim() || null }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      router.push(`/guide/${data.id}`);
    } else {
      setError(data.error || "Failed to create");
    }
  };

  if (!user) return null;

  return (
    <>
      <div className="mb-6">
        <Link href="/guide" className="inline-flex items-center gap-2 text-sm text-space-500 hover:text-holo transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to guides
        </Link>
        <h1 className="text-2xl font-bold text-space-200 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-holo" /> Write a guide
        </h1>
        <p className="text-sm text-space-500 mt-1">Your guide will be reviewed before it&apos;s published.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
        <div>
          <label className="block text-sm font-medium text-space-300 mb-1.5">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Getting Started with Star Citizen"
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-space-300 mb-1.5">Short summary (optional)</label>
          <input
            type="text"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="A brief description for the guide list"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-space-300 mb-1.5">Content</label>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Write your guide here. Use the toolbar for bold, italic, underline, bullet points, headings, and more."
            minHeight="300px"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={busy || !title.trim() || !hasContent(content)}
            className="px-6 py-2.5 bg-holo/20 border border-holo/40 text-holo rounded-xl text-sm font-medium hover:bg-holo/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Submit for review"}
          </button>
          <Link href="/guide" className="px-6 py-2.5 bg-space-800/50 border border-glass-border text-space-300 rounded-xl text-sm font-medium hover:bg-space-800">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
