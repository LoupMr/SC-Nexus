"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Loader2, Clock, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

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

export default function GuideListPage() {
  const { user, canManageGuide } = useAuth();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const fetchGuides = useCallback(async () => {
    const url = showAll && user ? "/api/guides?admin=1" : "/api/guides";
    const res = await fetch(url);
    if (res.ok) setGuides(await res.json());
    setLoading(false);
  }, [showAll, user]);

  useEffect(() => {
    const id = setTimeout(() => void fetchGuides(), 0);
    return () => clearTimeout(id);
  }, [fetchGuides]);

  if (loading) {
    return (
      <>
        <PageHeader icon={BookOpen} title="Guides" subtitle="Org guides and tutorials for new members" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-holo animate-spin" />
        </div>
      </>
    );
  }

  const approvedGuides = guides.filter((g) => g.status === "approved");
  const pendingGuides = guides.filter((g) => g.status === "pending" || g.status === "draft");

  return (
    <>
      <PageHeader
        icon={BookOpen}
        title="Guides"
        subtitle="Org guides and tutorials — written by members for new recruits"
      />

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {user && (
          <Link
            href="/guide/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-holo/10 border border-holo/30 text-holo rounded-xl text-sm font-medium hover:bg-holo/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Write a guide
          </Link>
        )}
        {user && canManageGuide && (
          <button
            onClick={() => setShowAll((s) => !s)}
            className="flex items-center gap-2 px-4 py-2.5 bg-space-800/50 border border-glass-border text-space-300 rounded-xl text-sm font-medium hover:bg-space-800 transition-all"
          >
            {showAll ? "Show approved only" : "Show all (including pending)"}
          </button>
        )}
      </div>

      {canManageGuide && pendingGuides.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-industrial mb-3 flex items-center gap-2">
            Pending approval ({pendingGuides.length})
          </h2>
          <div className="space-y-3">
            {pendingGuides.map((guide) => (
              <div
                key={guide.id}
                className="glass-card rounded-xl p-4 border border-industrial/20 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <Link href={`/guide/${guide.id}`} className="text-base font-semibold text-space-200 hover:text-holo transition-colors">
                    {guide.title}
                  </Link>
                  <p className="text-sm text-space-500 mt-1">
                    by {guide.authorUsername} · {new Date(guide.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/guide/${guide.id}`}
                  className="px-4 py-2 rounded-lg bg-industrial/10 border border-industrial/30 text-industrial text-sm font-medium hover:bg-industrial/20 transition-all"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-space-400 mb-3">
          {canManageGuide && showAll ? "All guides" : "Published guides"}
        </h2>
        <div className="space-y-4">
          {(showAll && canManageGuide ? guides : approvedGuides).map((guide) => (
            <Link
              key={guide.id}
              href={`/guide/${guide.id}`}
              className="block glass-card rounded-xl p-5 border border-glass-border hover:border-holo/25 transition-colors"
            >
              <h3 className="text-lg font-semibold text-space-200 mb-1">{guide.title}</h3>
              {guide.excerpt && (
                <p className="text-sm text-space-500 mb-3 line-clamp-2">{guide.excerpt}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-space-500">
                <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{guide.authorUsername}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(guide.approvedAt || guide.createdAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>

        {(showAll ? guides : approvedGuides).length === 0 && (
          <div className="text-center py-16 rounded-xl border-2 border-dashed border-glass-border bg-space-900/20">
            <BookOpen className="w-12 h-12 text-space-600 mx-auto mb-3" />
            <p className="text-space-500 text-sm">No guides yet.</p>
            {user && (
              <Link href="/guide/new" className="inline-block mt-4 text-sm text-holo hover:underline">
                Write the first guide
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
