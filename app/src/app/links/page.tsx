"use client";

import { useState, useEffect, useCallback } from "react";
import { Link2, Plus, Pencil, Trash2, Loader2, X, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";
import { inputClass } from "@/lib/styles";

interface LinkItem {
  id: string;
  title: string;
  description: string;
  url: string;
  sortOrder: number;
}

type ModalMode = null | "create" | "edit" | "delete";

export default function LinksPage() {
  const { isAdmin } = useAuth();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", url: "" });

  const fetchLinks = useCallback(async () => {
    const res = await fetch("/api/links");
    if (res.ok) setLinks(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void fetchLinks(), 0);
    return () => clearTimeout(id);
  }, [fetchLinks]);

  const openCreateModal = () => {
    setForm({ title: "", description: "", url: "" });
    setEditingLink(null);
    setModalMode("create");
  };

  const openEditModal = (link: LinkItem) => {
    setForm({ title: link.title, description: link.description, url: link.url });
    setEditingLink(link);
    setModalMode("edit");
  };

  const openDeleteModal = (link: LinkItem) => {
    setEditingLink(link);
    setModalMode("delete");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingLink(null);
    setForm({ title: "", description: "", url: "" });
  };

  const handleCreate = async () => {
    if (!form.title || !form.url) return;
    setBusy(true);
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) {
      const created = await res.json();
      setLinks((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
      closeModal();
    }
  };

  const handleUpdate = async () => {
    if (!editingLink || !form.title || !form.url) return;
    setBusy(true);
    const res = await fetch(`/api/links/${encodeURIComponent(editingLink.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) {
      const updated = await res.json();
      setLinks((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      closeModal();
    }
  };

  const handleDelete = async () => {
    if (!editingLink) return;
    setBusy(true);
    const res = await fetch(`/api/links/${encodeURIComponent(editingLink.id)}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      setLinks((prev) => prev.filter((l) => l.id !== editingLink.id));
      closeModal();
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader icon={Link2} title="USEFUL LINKS" subtitle="Curated Star Citizen resources & tools" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-holo animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        icon={Link2}
        title="USEFUL LINKS"
        subtitle="Curated Star Citizen resources & tools"
      />

      {isAdmin && (
        <div className="mb-4">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-holo/10 border border-holo/30 text-holo rounded-lg text-sm font-medium hover:bg-holo/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Link
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => (
          <div key={link.id} className="glass-card rounded-xl overflow-hidden group">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-5 hover:bg-space-800/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-holo/10 border border-holo/30 flex items-center justify-center flex-shrink-0">
                  <Link2 className="w-5 h-5 text-holo" />
                </div>
                <ExternalLink className="w-4 h-4 text-space-500 group-hover:text-holo transition-colors flex-shrink-0" />
              </div>
              <h3 className="text-base font-semibold text-space-200 mb-1">{link.title}</h3>
              {link.description && (
                <p className="text-xs text-space-500 line-clamp-2">{link.description}</p>
              )}
            </a>
            {isAdmin && (
              <div className="flex items-center gap-1.5 px-5 py-3 border-t border-glass-border bg-space-900/30">
                <button
                  onClick={() => openEditModal(link)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-space-500 hover:text-holo hover:bg-holo/10 border border-transparent hover:border-holo/20 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => openDeleteModal(link)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-space-500 hover:text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {links.length === 0 && (
        <div className="text-center py-20">
          <Link2 className="w-12 h-12 text-space-700 mx-auto mb-3" />
          <p className="text-space-500 text-sm">No links yet.</p>
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="mt-3 text-holo text-xs hover:underline"
            >
              Add your first link
            </button>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(modalMode === "create" || modalMode === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={closeModal}>
          <div
            className="glass-card rounded-xl p-6 w-full max-w-md border border-glass-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-space-200">
                {modalMode === "create" ? "Add Link" : "Edit Link"}
              </h3>
              <button onClick={closeModal} className="text-space-500 hover:text-space-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-space-500 mb-1.5">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Star Citizen Database"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-space-500 mb-1.5">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. Universal Item Finder"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-space-500 mb-1.5">URL</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg text-sm text-space-400 hover:text-space-200 border border-space-700/50">
                Cancel
              </button>
              <button
                onClick={modalMode === "create" ? handleCreate : handleUpdate}
                disabled={busy || !form.title || !form.url}
                className="px-4 py-2 rounded-lg text-sm bg-holo/20 border border-holo/40 text-holo font-medium hover:bg-holo/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {modalMode === "create" ? "Add" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modalMode === "delete" && editingLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={closeModal}>
          <div
            className="glass-card rounded-xl p-6 w-full max-w-md border border-glass-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-space-200 mb-2">Delete Link</h3>
            <p className="text-sm text-space-400 mb-4">
              Remove &quot;{editingLink.title}&quot;? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg text-sm text-space-400 hover:text-space-200 border border-space-700/50">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-sm bg-danger/20 border border-danger/40 text-danger font-medium hover:bg-danger/30 disabled:opacity-50 flex items-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
