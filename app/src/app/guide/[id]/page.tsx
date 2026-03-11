"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DOMPurify from "dompurify";
import { BookOpen, Loader2, User, Clock, ArrowLeft, Pencil, Check, X, Trash2 } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import Portal from "@/components/Portal";

function isHtml(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith("<") && trimmed.includes(">");
}

interface Guide {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  authorUsername: string;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function GuideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, canManageGuide } = useAuth();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const id = params.id as string;

  useEffect(() => {
    if (!id) return;
    fetch(`/api/guides/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setGuide(null);
        else setGuide(data);
      })
      .catch(() => setGuide(null))
      .finally(() => setLoading(false));
  }, [id]);

  const isAuthor = user && guide && guide.authorUsername.toLowerCase() === user.username.toLowerCase();
  const canEdit = isAuthor || canManageGuide;

  const handleApprove = async () => {
    if (!canManageGuide) return;
    setBusy(true);
    const res = await fetch(`/api/guides/${id}/approve`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const updated = await res.json();
      setGuide(updated);
    }
  };

  const handleReject = async () => {
    if (!canManageGuide) return;
    setBusy(true);
    await fetch(`/api/guides/${id}/approve`, { method: "DELETE" });
    setBusy(false);
    const res = await fetch(`/api/guides/${id}`);
    if (res.ok) setGuide(await res.json());
  };

  const handleDelete = async () => {
    if (!canEdit) return;
    setBusy(true);
    const res = await fetch(`/api/guides/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.push("/guide");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-holo animate-spin" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="text-center py-20">
        <BookOpen className="w-12 h-12 text-space-600 mx-auto mb-3" />
        <p className="text-space-500 mb-4">Guide not found.</p>
        <Link href="/guide" className="text-holo hover:underline">Back to guides</Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Link href="/guide" className="inline-flex items-center gap-2 text-sm text-space-500 hover:text-holo transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to guides
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-space-200">{guide.title}</h1>
              {guide.status !== "approved" && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-industrial/10 border border-industrial/30 text-industrial">
                  {guide.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-space-500">
              <span className="flex items-center gap-1"><User className="w-4 h-4" />{guide.authorUsername}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{new Date(guide.approvedAt || guide.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2 flex-wrap">
              {guide.status !== "approved" && canManageGuide && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={busy}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-success/10 border border-success/30 text-success text-sm font-medium hover:bg-success/20 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={busy}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-space-800/50 border border-glass-border text-space-400 text-sm font-medium hover:text-industrial disabled:opacity-50"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                </>
              )}
              {isAuthor && (
                <Link
                  href={`/guide/${id}/edit`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-holo/10 border border-holo/30 text-holo text-sm font-medium hover:bg-holo/20"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </Link>
              )}
              <button
                onClick={() => setDeleteConfirm(true)}
                disabled={busy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm font-medium hover:bg-danger/20 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <article className="glass-card rounded-xl p-6 sm:p-8 border border-glass-border min-w-0">
        <div className="prose prose-invert max-w-none min-w-0 [&_*]:break-words">
          {isHtml(guide.content) ? (
            <div
              className="text-space-200 font-sans leading-relaxed break-words [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_h1]:text-xl [&_h2]:text-lg [&_h1]:font-bold [&_h2]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-holo/50 [&_blockquote]:pl-4 [&_blockquote]:italic"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(guide.content, {
                  ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "h1", "h2", "h3", "ul", "ol", "li", "blockquote", "hr"],
                }),
              }}
            />
          ) : (
            <div className="text-space-200 font-sans leading-relaxed whitespace-pre-wrap break-words">
              {guide.content}
            </div>
          )}
        </div>
      </article>

      {deleteConfirm && (
        <Portal>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm border border-danger/20">
            <h3 className="text-lg font-semibold text-space-200 mb-2">Delete guide?</h3>
            <p className="text-sm text-space-500 mb-4">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2.5 bg-space-800/50 border border-glass-border text-space-300 rounded-xl text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="flex-1 py-2.5 bg-danger/20 border border-danger/40 text-danger rounded-xl text-sm font-medium hover:bg-danger/30 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </>
  );
}
