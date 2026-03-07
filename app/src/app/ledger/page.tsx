"use client";

import Image from "next/image";
import { useState, useMemo, useEffect, useCallback } from "react";
import { BookOpen, Plus, Minus, Trash2, MapPin, User, Package, History, X, ChevronDown, ChevronUp, Loader2, Info, UserCircle, Globe, Lock, Search, Filter, Download, LayoutList, LayoutGrid, Square } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";
import Combobox, { ComboboxOption } from "@/components/Combobox";
import { getAllItems, getItemStats, subcategories, categories, DatabaseItem, getSubcategoryLabel } from "@/lib/database";
import locationsData from "@/data/Locations/LOCATIONS.json";
import clsx from "clsx";

interface HistoryEntry {
  action: string;
  user: string;
  timestamp: string;
  quantity: number;
}

interface LedgerEntry {
  id: string;
  itemName: string;
  subcategory: string;
  owner: string;
  ownerAvatarUrl?: string | null;
  status: string;
  quantity: number;
  location: string;
  sharedWithOrg: boolean;
  history: HistoryEntry[];
}

const statusColors: Record<string, { dot: string; badge: string }> = {
  Available: { dot: "bg-success", badge: "text-success bg-success/10 border-success/30" },
  "Low Stock": { dot: "bg-industrial", badge: "text-industrial bg-industrial/10 border-industrial/30" },
  Depleted: { dot: "bg-danger", badge: "text-danger bg-danger/10 border-danger/30" },
};

type ModalMode = null | "add" | "take" | "delete" | "info";

const allDbItems = getAllItems();

const itemOptions: ComboboxOption[] = allDbItems.map((item) => ({
  value: item.Name,
  label: item.Name,
  group: getSubcategoryLabel(item.subcategory),
}));

const subcategoryOptions: ComboboxOption[] = subcategories.map((sub) => ({
  value: sub.id,
  label: sub.label,
}));

const locationOptions: ComboboxOption[] = locationsData.flatMap((sys) =>
  sys.locations.map((loc) => ({
    value: loc,
    label: loc,
    group: sys.system,
  }))
);

type LedgerView = "org" | "mine";
type LayoutMode = "list" | "grid" | "compact";

export default function LedgerPage() {
  const { isAdmin, canEditLedger, user } = useAuth();
  const [view, setView] = useState<LedgerView>("org");
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [targetEntryId, setTargetEntryId] = useState<string | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSize, setFilterSize] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [infoItem, setInfoItem] = useState<DatabaseItem | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    if (typeof window === "undefined") return "list";
    const saved = localStorage.getItem("ledger-layout") as LayoutMode | null;
    return saved === "list" || saved === "grid" || saved === "compact" ? saved : "list";
  });

  useEffect(() => {
    localStorage.setItem("ledger-layout", layoutMode);
  }, [layoutMode]);

  const [addForm, setAddForm] = useState({
    itemName: "",
    subcategory: "",
    quantity: 1,
    location: "",
    sharedWithOrg: false,
  });

  const [takeForm, setTakeForm] = useState({ quantity: 1 });

  const fetchEntries = useCallback(async () => {
    const res = await fetch(`/api/ledger?view=${view}`);
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }, [view]);

  useEffect(() => {
    const id = setTimeout(() => {
      setLoading(true);
      void fetchEntries();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchEntries]);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const matchSearch =
        !search ||
        entry.itemName.toLowerCase().includes(search.toLowerCase()) ||
        entry.owner.toLowerCase().includes(search.toLowerCase()) ||
        entry.location.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || entry.status === filterStatus;
      const sub = subcategories.find((s) => s.id === entry.subcategory);
      const matchCategory = filterCategory === "all" || (sub?.category === filterCategory);
      const dbItem = allDbItems.find((i) => i.Name.toLowerCase() === entry.itemName.toLowerCase());
      const entrySize = dbItem?.Size != null ? String(dbItem.Size) : null;
      const entryGrade = dbItem?.Grade != null ? String(dbItem.Grade) : null;
      const matchSize = filterSize === "all" || entrySize === filterSize;
      const matchGrade = filterGrade === "all" || entryGrade === filterGrade;
      return matchSearch && matchStatus && matchCategory && matchSize && matchGrade;
    });
  }, [entries, search, filterStatus, filterCategory, filterSize, filterGrade]);

  const handleAddEntry = async () => {
    if (!addForm.itemName || !addForm.subcategory || !addForm.location) return;
    setBusy(true);
    await fetch("/api/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemName: addForm.itemName,
        subcategory: addForm.subcategory,
        quantity: addForm.quantity,
        location: addForm.location,
        sharedWithOrg: addForm.sharedWithOrg,
      }),
    });
    setModalMode(null);
    setAddForm({ itemName: "", subcategory: "", quantity: 1, location: "", sharedWithOrg: false });
    await fetchEntries();
    setBusy(false);
  };

  const handleToggleShared = async (entryId: string, sharedWithOrg: boolean) => {
    setBusy(true);
    const res = await fetch(`/api/ledger/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sharedWithOrg }),
    });
    if (res.ok) await fetchEntries();
    setBusy(false);
  };

  const openTakeModal = (entryId: string) => {
    setTargetEntryId(entryId);
    setTakeForm({ quantity: 1 });
    setModalMode("take");
  };

  const openDeleteModal = (entryId: string) => {
    setTargetEntryId(entryId);
    setModalMode("delete");
  };

  const openInfoModal = (itemName: string) => {
    const dbItem = allDbItems.find((i) => i.Name.toLowerCase() === itemName.toLowerCase());
    setInfoItem(dbItem || null);
    setModalMode("info");
  };

  const handleTakeItem = async () => {
    if (!targetEntryId) return;
    setBusy(true);
    await fetch(`/api/ledger/${targetEntryId}/take`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: Math.max(1, takeForm.quantity) }),
    });
    setModalMode(null);
    setTargetEntryId(null);
    await fetchEntries();
    setBusy(false);
  };

  const handleDeleteEntry = async () => {
    if (!targetEntryId) return;
    setBusy(true);
    await fetch(`/api/ledger/${targetEntryId}`, { method: "DELETE" });
    setModalMode(null);
    setTargetEntryId(null);
    await fetchEntries();
    setBusy(false);
  };

  const handleItemSelect = (value: string) => {
    setAddForm((p) => ({ ...p, itemName: value }));
    const dbItem = allDbItems.find((i) => i.Name === value);
    if (dbItem) {
      setAddForm((p) => ({ ...p, itemName: value, subcategory: dbItem.subcategory }));
    }
  };

  const targetEntry = targetEntryId ? entries.find((e) => e.id === targetEntryId) : null;
  const hasDbMatch = (name: string) => allDbItems.some((i) => i.Name.toLowerCase() === name.toLowerCase());
  const canTakeFrom = (entry: LedgerEntry) =>
    entry.owner === user?.username || (entry.sharedWithOrg && canEditLedger);
  const canDeleteEntry = (entry: LedgerEntry) => isAdmin || entry.owner === user?.username;
  const canToggleShared = (entry: LedgerEntry) => entry.owner === user?.username;

  const stats = useMemo(() => ({
    total: filtered.length,
    quantity: filtered.reduce((s, e) => s + e.quantity, 0),
    lowStock: filtered.filter((e) => e.status === "Low Stock" || e.status === "Depleted").length,
  }), [filtered]);

  const inputClass = "w-full px-3 py-2.5 bg-space-900/60 border border-glass-border rounded-xl text-sm text-space-200 placeholder:text-space-600 focus:outline-none focus:border-holo/40 focus:ring-2 focus:ring-holo/20 transition-all";

  if (loading) {
    return (
      <>
        <PageHeader icon={BookOpen} title="THE LEDGER" subtitle="Org inventory tracker — stock levels and audit trail" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-holo animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        icon={BookOpen}
        title="The Ledger"
        subtitle={view === "org" ? "Shared org inventory — see what members have made available" : "Your personal stash — only you see this"}
      />

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl bg-space-900/50 border border-glass-border px-4 py-3">
          <div className="text-2xl font-bold text-space-200">{stats.total}</div>
          <div className="text-xs text-space-500">Items</div>
        </div>
        <div className="rounded-xl bg-space-900/50 border border-glass-border px-4 py-3">
          <div className="text-2xl font-bold text-space-200">{stats.quantity}</div>
          <div className="text-xs text-space-500">Total units</div>
        </div>
        <div className="rounded-xl bg-space-900/50 border border-glass-border px-4 py-3">
          <div className="text-2xl font-bold text-industrial">{stats.lowStock}</div>
          <div className="text-xs text-space-500">Need restock</div>
        </div>
        <div className="rounded-xl bg-space-900/50 border border-glass-border px-4 py-3 flex items-center justify-center">
          <button
            onClick={() => setModalMode("add")}
            className="flex items-center gap-2 px-4 py-2 bg-holo/15 border border-holo/40 text-holo rounded-lg text-sm font-medium hover:bg-holo/25 transition-all"
          >
            <Plus className="w-4 h-4" /> Add item
          </button>
        </div>
      </div>

      {/* Main toolbar */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* View toggle */}
          <div className="flex rounded-xl border border-glass-border bg-space-900/40 p-1">
            <button
              onClick={() => setView("org")}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                view === "org"
                  ? "bg-holo/20 text-holo shadow-sm"
                  : "text-space-400 hover:text-space-200 hover:bg-space-800/40"
              )}
            >
              <Globe className="w-4 h-4" /> Org
            </button>
            <button
              onClick={() => setView("mine")}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                view === "mine"
                  ? "bg-holo/20 text-holo shadow-sm"
                  : "text-space-400 hover:text-space-200 hover:bg-space-800/40"
              )}
            >
              <UserCircle className="w-4 h-4" /> Mine
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
            <input
              type="text"
              placeholder="Search by item, owner, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass + " pl-10"}
            />
          </div>

          {/* Status pills */}
          <div className="flex gap-2 flex-wrap">
            {["all", "Available", "Low Stock", "Depleted"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={clsx(
                  "px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  filterStatus === status
                    ? "bg-holo/15 text-holo border border-holo/40"
                    : "bg-space-900/40 text-space-400 hover:text-space-200 border border-transparent"
                )}
              >
                {status === "all" ? "All" : status}
              </button>
            ))}
          </div>

          {/* Layout & Export & Filters */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-glass-border bg-space-900/40 p-0.5" title="Layout">
              <button
                onClick={() => setLayoutMode("list")}
                className={clsx(
                  "p-2 rounded-md transition-all",
                  layoutMode === "list" ? "bg-holo/20 text-holo" : "text-space-400 hover:text-space-200"
                )}
                title="List view"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode("grid")}
                className={clsx(
                  "p-2 rounded-md transition-all",
                  layoutMode === "grid" ? "bg-holo/20 text-holo" : "text-space-400 hover:text-space-200"
                )}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode("compact")}
                className={clsx(
                  "p-2 rounded-md transition-all",
                  layoutMode === "compact" ? "bg-holo/20 text-holo" : "text-space-400 hover:text-space-200"
                )}
                title="Compact grid (more items)"
              >
                <Square className="w-4 h-4" />
              </button>
            </div>
            <a
              href={`/api/export/ledger?view=${view}&format=csv`}
              download
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-space-400 hover:text-holo hover:bg-space-800/50 transition-colors"
              title="Export as CSV"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={() => setFiltersOpen((o) => !o)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
              filtersOpen || filterCategory !== "all" || filterSize !== "all" || filterGrade !== "all"
                ? "bg-holo/10 border-holo/30 text-holo"
                : "bg-space-900/40 border-glass-border text-space-400 hover:text-space-200"
            )}
          >
            <Filter className="w-4 h-4" /> Filters
            {(filterCategory !== "all" || filterSize !== "all" || filterGrade !== "all") && (
              <span className="w-2 h-2 rounded-full bg-holo" />
            )}
          </button>
          </div>
        </div>

        {/* Collapsible filters */}
        {filtersOpen && (
          <div className="flex flex-wrap gap-3 items-center p-4 rounded-xl bg-space-900/30 border border-glass-border">
            <span className="text-xs text-space-500 font-medium">Refine by:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border bg-space-900/60 border-glass-border text-space-300 focus:outline-none focus:border-holo/40"
            >
              <option value="all">All categories</option>
              {categories.filter((c) => c.id !== "all").map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <select
              value={filterSize}
              onChange={(e) => setFilterSize(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border bg-space-900/60 border-glass-border text-space-300 focus:outline-none focus:border-holo/40"
            >
              <option value="all">All sizes</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={String(s)}>Size {s}</option>
              ))}
            </select>
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border bg-space-900/60 border-glass-border text-space-300 focus:outline-none focus:border-holo/40"
            >
              <option value="all">All grades</option>
              {["A", "B", "C", "D"].map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
            {(filterCategory !== "all" || filterSize !== "all" || filterGrade !== "all") && (
              <button
                onClick={() => { setFilterCategory("all"); setFilterSize("all"); setFilterGrade("all"); }}
                className="text-sm text-space-500 hover:text-holo transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      <div
        className={clsx(
          layoutMode === "list" && "space-y-3",
          layoutMode === "grid" && "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-start",
          layoutMode === "compact" && "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 items-start"
        )}
      >
        {filtered.map((entry) => {
          const colors = statusColors[entry.status] || statusColors.Available;
          const isExpanded = expandedEntry === entry.id;
          const linkedToDb = hasDbMatch(entry.itemName);

          const EntryCard = layoutMode === "list" ? (
            <div key={entry.id} className="glass-card rounded-xl overflow-hidden hover:border-holo/25 transition-colors">
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    <div className={clsx("w-3 h-3 rounded-full flex-shrink-0 mt-1.5 animate-pulse-glow", colors.dot)} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <h3 className="text-base font-semibold text-space-200">{entry.itemName}</h3>
                        <span className={clsx("text-xs px-2.5 py-1 rounded-lg font-medium", colors.badge)}>
                          {entry.status}
                        </span>
                        {entry.sharedWithOrg && (
                          <span className="text-xs px-2 py-1 rounded-lg bg-holo/10 border border-holo/30 text-holo flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Shared
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-space-500">
                        <span className="flex items-center gap-1.5">
                          {entry.ownerAvatarUrl ? (
                            <Image src={entry.ownerAvatarUrl} alt="" width={20} height={20} className="w-5 h-5 rounded-full object-cover flex-shrink-0" unoptimized />
                          ) : (
                            <User className="w-3.5 h-3.5 text-space-600" />
                          )}
                          {entry.owner}
                        </span>
                        <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-space-600" /><strong className="text-space-300">{entry.quantity}</strong> units</span>
                        <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-space-600" />{entry.location}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap sm:flex-nowrap">
                  {linkedToDb && (
                    <button
                      onClick={() => openInfoModal(entry.itemName)}
                      title="View item details"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-space-800/50 border border-glass-border text-space-300 hover:bg-holo/10 hover:text-holo hover:border-holo/30 transition-all"
                    >
                      <Info className="w-3.5 h-3.5" /> Details
                    </button>
                  )}
                  {canToggleShared(entry) && (
                    <button
                      onClick={() => handleToggleShared(entry.id, !entry.sharedWithOrg)}
                      disabled={busy}
                      title={entry.sharedWithOrg ? "Make private (remove from org)" : "Share with org"}
                      className={clsx(
                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        entry.sharedWithOrg
                          ? "bg-holo/10 border border-holo/30 text-holo hover:bg-holo/20"
                          : "bg-space-800/50 border border-glass-border text-space-400 hover:text-space-200"
                      )}
                    >
                      {entry.sharedWithOrg ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {entry.sharedWithOrg ? "Shared" : "Private"}
                    </button>
                  )}
                  {canTakeFrom(entry) && entry.quantity > 0 && (
                    <button
                      onClick={() => openTakeModal(entry.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-industrial/10 border border-industrial/30 text-industrial hover:bg-industrial/20 transition-all"
                    >
                      <Minus className="w-3.5 h-3.5" /> Take
                    </button>
                  )}
                  {canDeleteEntry(entry) && (
                    <button
                      onClick={() => openDeleteModal(entry.id)}
                      title="Remove entry"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-space-800/50 border border-glass-border text-space-400 hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                    title={isExpanded ? "Hide history" : "View history"}
                    className="flex items-center justify-center w-9 h-9 rounded-lg text-space-500 hover:text-space-200 hover:bg-space-800/50 transition-all"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-glass-border px-4 sm:px-5 py-4 bg-space-900/20">
                  <div className="flex items-center gap-2 text-sm text-space-400 mb-3">
                    <History className="w-4 h-4" /> Activity history
                  </div>
                  <div className="space-y-2.5">
                    {entry.history.map((h, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <div className={clsx(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          h.action === "added" ? "bg-success" : "bg-industrial"
                        )} />
                        <span className="text-space-500 font-mono text-xs whitespace-nowrap">
                          {new Date(h.timestamp).toLocaleString()}
                        </span>
                        <span className="text-space-300">
                          <strong className="text-space-200">{h.user}</strong>{" "}
                          <span className={h.action === "taken" ? "text-industrial" : "text-success"}>
                            {h.action}
                          </span>{" "}
                          <strong>{h.quantity}</strong> unit{h.quantity !== 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              key={entry.id}
              className={clsx(
                "glass-card rounded-xl overflow-hidden hover:border-holo/25 transition-colors flex flex-col min-h-0",
                layoutMode === "grid" && "min-h-[160px]",
                layoutMode === "compact" && "min-h-[120px]"
              )}
            >
              <div className={clsx("flex flex-col flex-1 p-3", layoutMode === "compact" && "p-2")}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className={clsx("w-2 h-2 rounded-full flex-shrink-0 mt-1 animate-pulse-glow", colors.dot)} />
                  <div className="flex-1 min-w-0">
                    <h3 className={clsx("font-semibold text-space-200 truncate", layoutMode === "compact" ? "text-xs" : "text-sm")} title={entry.itemName}>
                      {entry.itemName}
                    </h3>
                    <span className={clsx("text-space-500 truncate block flex items-center gap-1", layoutMode === "compact" ? "text-[10px]" : "text-xs")}>
                      {entry.ownerAvatarUrl ? (
                        <Image src={entry.ownerAvatarUrl} alt="" width={14} height={14} className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0" unoptimized />
                      ) : null}
                      {entry.owner} · {entry.location}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-auto flex-wrap">
                  <span className={clsx("font-medium text-space-300", layoutMode === "compact" ? "text-xs" : "text-sm")}>
                    {entry.quantity} units
                  </span>
                  <span className={clsx("px-1.5 py-0.5 rounded font-medium", colors.badge, layoutMode === "compact" ? "text-[10px]" : "text-xs")}>
                    {entry.status}
                  </span>
                  {entry.sharedWithOrg && <Globe className="w-3 h-3 text-holo flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {linkedToDb && (
                    <button onClick={() => openInfoModal(entry.itemName)} title="Details" className="p-1.5 rounded text-space-400 hover:text-holo hover:bg-holo/10 transition-colors">
                      <Info className="w-3 h-3" />
                    </button>
                  )}
                  {canToggleShared(entry) && (
                    <button
                      onClick={() => handleToggleShared(entry.id, !entry.sharedWithOrg)}
                      disabled={busy}
                      title={entry.sharedWithOrg ? "Make private" : "Share"}
                      className={clsx("p-1.5 rounded transition-colors", entry.sharedWithOrg ? "text-holo" : "text-space-400 hover:text-space-200")}
                    >
                      {entry.sharedWithOrg ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    </button>
                  )}
                  {canTakeFrom(entry) && entry.quantity > 0 && (
                    <button onClick={() => openTakeModal(entry.id)} title="Take" className="p-1.5 rounded text-space-400 hover:text-industrial hover:bg-industrial/10 transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                  )}
                  {canDeleteEntry(entry) && (
                    <button onClick={() => openDeleteModal(entry.id)} title="Remove" className="p-1.5 rounded text-space-400 hover:text-danger hover:bg-danger/10 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                    title="History"
                    className="p-1.5 rounded text-space-400 hover:text-space-200 ml-auto"
                  >
                    <ChevronDown className={clsx("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-glass-border px-3 py-2 bg-space-900/20 text-xs space-y-1 max-h-24 overflow-y-auto">
                  {entry.history.slice(0, 3).map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={clsx("w-1.5 h-1.5 rounded-full", h.action === "added" ? "bg-success" : "bg-industrial")} />
                      <span className="text-space-500 truncate">{h.user} {h.action} {h.quantity}</span>
                    </div>
                  ))}
                  {entry.history.length > 3 && <span className="text-space-600 text-[10px]">+{entry.history.length - 3} more</span>}
                </div>
              )}
            </div>
          );

          return EntryCard;
        })}

        {filtered.length === 0 && (
          <div className={clsx(
            "text-center py-20 px-4 rounded-xl border-2 border-dashed border-glass-border bg-space-900/20",
            (layoutMode === "grid" || layoutMode === "compact") && "col-span-full"
          )}>
            <BookOpen className="w-14 h-14 text-space-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-space-300 mb-1">
              {search || filterStatus !== "all" || filterCategory !== "all" || filterSize !== "all" || filterGrade !== "all"
                ? "No matching items"
                : view === "org"
                  ? "Nothing shared yet"
                  : "Your ledger is empty"}
            </h3>
            <p className="text-sm text-space-500 mb-5 max-w-sm mx-auto">
              {search || filterStatus !== "all" || filterCategory !== "all" || filterSize !== "all" || filterGrade !== "all"
                ? "Try adjusting your search or filters."
                : view === "org"
                  ? "When members add items and share them, they&apos;ll appear here."
                  : "Add your first item to get started."}
            </p>
            {!search && filterStatus === "all" && filterCategory === "all" && filterSize === "all" && filterGrade === "all" && (
              <button
                onClick={() => setModalMode("add")}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-holo/15 border border-holo/40 text-holo rounded-xl text-sm font-medium hover:bg-holo/25 transition-all"
              >
                <Plus className="w-4 h-4" /> Add your first item
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Stock Modal */}
      {modalMode === "add" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md border border-holo/20 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-space-200 flex items-center gap-2">
                <Plus className="w-5 h-5 text-holo" /> Add item
              </h2>
              <button onClick={() => setModalMode(null)} className="p-2 rounded-lg text-space-500 hover:text-space-200 hover:bg-space-800/50 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-space-300 mb-1.5 block">What are you adding?</label>
                <Combobox
                  options={itemOptions}
                  value={addForm.itemName}
                  onChange={(val) => handleItemSelect(val)}
                  placeholder="Search or type item name..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-space-300 mb-1.5 block">Subcategory</label>
                <Combobox
                  options={subcategoryOptions}
                  value={addForm.subcategory}
                  onChange={(val) => setAddForm((p) => ({ ...p, subcategory: val }))}
                  placeholder="Select subcategory..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-space-300 mb-1.5 block">Where is it stored?</label>
                <Combobox
                  options={locationOptions}
                  value={addForm.location}
                  onChange={(val) => setAddForm((p) => ({ ...p, location: val }))}
                  placeholder="Search locations..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-space-300 mb-1.5 block">How many?</label>
                <input
                  type="number"
                  min={1}
                  value={addForm.quantity}
                  onChange={(e) => setAddForm((p) => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                  className={inputClass}
                />
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-space-900/40 border border-glass-border cursor-pointer hover:border-holo/20 transition-colors">
                <input
                  type="checkbox"
                  checked={addForm.sharedWithOrg}
                  onChange={(e) => setAddForm((p) => ({ ...p, sharedWithOrg: e.target.checked }))}
                  className="w-4 h-4 rounded border-glass-border bg-space-900 text-holo focus:ring-holo/40"
                />
                <span className="text-sm text-space-300">Share with org — show in the shared Org Ledger so others can see and take</span>
              </label>
            </div>

            <button
              onClick={handleAddEntry}
              disabled={!addForm.itemName || !addForm.subcategory || !addForm.location || busy}
              className="w-full mt-6 py-3 bg-holo/20 border border-holo/40 text-holo rounded-xl text-sm font-medium hover:bg-holo/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? "Adding..." : "Add to ledger"}
            </button>
          </div>
        </div>
      )}

      {/* Take Item Modal */}
      {modalMode === "take" && targetEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm border border-industrial/20 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-space-200 flex items-center gap-2">
                <Minus className="w-5 h-5 text-industrial" /> Take item
              </h2>
              <button onClick={() => setModalMode(null)} className="p-2 rounded-lg text-space-500 hover:text-space-200 hover:bg-space-800/50 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl p-4 mb-5 bg-space-900/40 border border-glass-border">
              <p className="text-base font-medium text-space-200">{targetEntry.itemName}</p>
              <p className="text-sm text-space-500 mt-1">
                <strong className="text-space-300">{targetEntry.quantity}</strong> available at {targetEntry.location}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-space-300 mb-1.5 block">How many are you taking?</label>
              <input
                type="number"
                min={1}
                max={targetEntry.quantity}
                value={takeForm.quantity}
                onChange={(e) => setTakeForm({ quantity: Math.min(parseInt(e.target.value) || 1, targetEntry.quantity) })}
                className={inputClass}
              />
              <p className="text-xs text-space-500 mt-1.5">
                Logged as taken by <strong className="text-space-400">{user?.username}</strong>
              </p>
            </div>

            <button
              onClick={handleTakeItem}
              disabled={busy}
              className="w-full mt-6 py-3 bg-industrial/20 border border-industrial/40 text-industrial rounded-xl text-sm font-medium hover:bg-industrial/30 transition-all disabled:opacity-50"
            >
              {busy ? "Processing..." : "Confirm"}
            </button>
          </div>
        </div>
      )}

      {/* Delete Entry Modal */}
      {modalMode === "delete" && targetEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm border border-danger/20 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-space-200 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-danger" /> Remove entry
              </h2>
              <button onClick={() => setModalMode(null)} className="p-2 rounded-lg text-space-500 hover:text-space-200 hover:bg-space-800/50 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl p-4 mb-4 bg-space-900/40 border border-glass-border">
              <p className="text-base font-medium text-space-200">{targetEntry.itemName}</p>
              <p className="text-sm text-space-500 mt-1">
                {targetEntry.quantity} units at {targetEntry.location} · {targetEntry.owner}
              </p>
            </div>

            <p className="text-sm text-space-400 mb-5">
              This will permanently remove this entry and its history. This can&apos;t be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setModalMode(null)}
                className="flex-1 py-3 bg-space-800/50 border border-glass-border text-space-300 rounded-xl text-sm font-medium hover:bg-space-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEntry}
                disabled={busy}
                className="flex-1 py-3 bg-danger/20 border border-danger/40 text-danger rounded-xl text-sm font-medium hover:bg-danger/30 transition-all disabled:opacity-50"
              >
                {busy ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Info Modal */}
      {modalMode === "info" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md border border-holo/20 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-space-200 flex items-center gap-2">
                <Info className="w-5 h-5 text-holo" /> Item details
              </h2>
              <button onClick={() => { setModalMode(null); setInfoItem(null); }} className="p-2 rounded-lg text-space-500 hover:text-space-200 hover:bg-space-800/50 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {infoItem ? (
              <>
                <div className="rounded-xl p-4 mb-4 bg-space-900/40 border border-glass-border">
                  <h3 className="text-base font-semibold text-space-200">{infoItem.Name}</h3>
                  <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-lg bg-holo/10 border border-holo/30 text-holo">
                    {getSubcategoryLabel(infoItem.subcategory)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {getItemStats(infoItem).map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-xl bg-space-900/40 border border-glass-border px-4 py-3"
                    >
                      <div className="text-xs text-space-500 uppercase tracking-wider">{label}</div>
                      <div className="text-sm font-medium text-space-200 font-mono mt-1">
                        {String(value ?? "—")}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Info className="w-12 h-12 text-space-600 mx-auto mb-3" />
                <p className="text-space-500 text-sm">Item not found in the database.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
