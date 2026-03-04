"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { BookOpen, Plus, Minus, Trash2, Clock, MapPin, User, Package, History, X, ChevronDown, ChevronUp, Loader2, Info } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";
import Combobox, { ComboboxOption } from "@/components/Combobox";
import { getAllItems, getItemStats, subcategories, DatabaseItem, getSubcategoryLabel } from "@/lib/database";
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
  status: string;
  quantity: number;
  location: string;
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

export default function LedgerPage() {
  const { isAdmin, canEditLedger, user } = useAuth();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [targetEntryId, setTargetEntryId] = useState<string | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [infoItem, setInfoItem] = useState<DatabaseItem | null>(null);

  const [addForm, setAddForm] = useState({
    itemName: "",
    subcategory: "",
    quantity: 1,
    location: "",
  });

  const [takeForm, setTakeForm] = useState({ quantity: 1 });

  const fetchEntries = useCallback(async () => {
    const res = await fetch("/api/ledger");
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const matchSearch =
        !search ||
        entry.itemName.toLowerCase().includes(search.toLowerCase()) ||
        entry.owner.toLowerCase().includes(search.toLowerCase()) ||
        entry.location.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || entry.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [entries, search, filterStatus]);

  const handleAddEntry = async () => {
    if (!addForm.itemName || !addForm.subcategory || !addForm.location) return;
    setBusy(true);
    await fetch("/api/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    setModalMode(null);
    setAddForm({ itemName: "", subcategory: "", quantity: 1, location: "" });
    await fetchEntries();
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

  const inputClass = "w-full px-3 py-2 bg-space-900/60 border border-glass-border rounded-lg text-sm text-space-200 focus:outline-none focus:border-holo/40 transition-all";

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
        title="THE LEDGER"
        subtitle="Org inventory tracker — stock levels and audit trail"
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search items, owners, or locations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-space-900/60 border border-glass-border rounded-lg text-sm text-space-200 placeholder:text-space-600 focus:outline-none focus:border-holo/40 transition-all"
        />

        <div className="flex gap-2 flex-wrap">
          {["all", "Available", "Low Stock", "Depleted"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                filterStatus === status
                  ? "bg-holo/10 border-holo/30 text-holo"
                  : "bg-space-900/40 border-space-700/30 text-space-400 hover:text-space-300"
              )}
            >
              {status === "all" ? "All" : status}
            </button>
          ))}
        </div>

        {canEditLedger && (
          <button
            onClick={() => setModalMode("add")}
            className="flex items-center gap-2 px-4 py-2.5 bg-holo/10 border border-holo/30 text-holo rounded-lg text-sm font-medium hover:bg-holo/20 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Stock
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filtered.map((entry) => {
          const colors = statusColors[entry.status] || statusColors.Available;
          const isExpanded = expandedEntry === entry.id;
          const linkedToDb = hasDbMatch(entry.itemName);

          return (
            <div key={entry.id} className="glass-card rounded-xl overflow-hidden">
              <div className="p-4 flex items-center gap-4">
                <div className={clsx("w-3 h-3 rounded-full flex-shrink-0 animate-pulse-glow", colors.dot)} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-semibold text-space-200 truncate">{entry.itemName}</h3>
                    <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border font-medium", colors.badge)}>
                      {entry.status}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-space-800/50 border border-space-700/30 text-space-400">
                      {entry.subcategory}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-space-500">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{entry.owner}</span>
                    <span className="flex items-center gap-1"><Package className="w-3 h-3" />Qty: <strong className="text-space-300">{entry.quantity}</strong></span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{entry.location}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {linkedToDb && (
                    <button
                      onClick={() => openInfoModal(entry.itemName)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-holo/10 border border-holo/30 text-holo hover:bg-holo/20 transition-all"
                    >
                      <Info className="w-3 h-3" /> Info
                    </button>
                  )}
                  {canEditLedger && entry.quantity > 0 && (
                    <button
                      onClick={() => openTakeModal(entry.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-industrial/10 border border-industrial/30 text-industrial hover:bg-industrial/20 transition-all"
                    >
                      <Minus className="w-3 h-3" /> Take
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => openDeleteModal(entry.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 transition-all"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                    className="text-space-500 hover:text-space-300 transition-colors p-1"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-glass-border px-4 py-3 bg-space-900/30">
                  <div className="flex items-center gap-1 text-xs text-space-400 mb-2">
                    <History className="w-3.5 h-3.5" /> Audit Trail
                  </div>
                  <div className="space-y-2">
                    {entry.history.map((h, i) => (
                      <div key={i} className="flex items-center gap-3 text-[11px]">
                        <div className={clsx(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          h.action === "added" ? "bg-success" : "bg-danger"
                        )} />
                        <span className="text-space-400 font-mono whitespace-nowrap">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(h.timestamp).toLocaleString()}
                        </span>
                        <span className="text-space-300">
                          <strong>{h.user}</strong>{" "}
                          <span className={h.action === "taken" ? "text-danger" : "text-success"}>
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
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 text-space-700 mx-auto mb-3" />
            <p className="text-space-500 text-sm">No ledger entries found.</p>
          </div>
        )}
      </div>

      {/* Add Stock Modal */}
      {modalMode === "add" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md mx-4 border border-holo/20">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-space-200 flex items-center gap-2">
                <Plus className="w-5 h-5 text-holo" /> Add Stock
              </h2>
              <button onClick={() => setModalMode(null)} className="text-space-500 hover:text-space-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-space-400 mb-1 block">Item Name</label>
                <Combobox
                  options={itemOptions}
                  value={addForm.itemName}
                  onChange={(val) => handleItemSelect(val)}
                  placeholder="Search items..."
                />
                <p className="text-[10px] text-space-600 mt-1">Select from the Armory database — subcategory auto-fills</p>
              </div>

              <div>
                <label className="text-xs text-space-400 mb-1 block">Subcategory</label>
                <Combobox
                  options={subcategoryOptions}
                  value={addForm.subcategory}
                  onChange={(val) => setAddForm((p) => ({ ...p, subcategory: val }))}
                  placeholder="Select subcategory..."
                />
              </div>

              <div>
                <label className="text-xs text-space-400 mb-1 block">Location</label>
                <Combobox
                  options={locationOptions}
                  value={addForm.location}
                  onChange={(val) => setAddForm((p) => ({ ...p, location: val }))}
                  placeholder="Search locations..."
                />
              </div>

              <div>
                <label className="text-xs text-space-400 mb-1 block">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={addForm.quantity}
                  onChange={(e) => setAddForm((p) => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                  className={inputClass}
                />
              </div>
            </div>

            <button
              onClick={handleAddEntry}
              disabled={!addForm.itemName || !addForm.subcategory || !addForm.location || busy}
              className="w-full mt-5 py-2.5 bg-holo/20 border border-holo/40 text-holo rounded-lg text-sm font-medium hover:bg-holo/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? "Adding..." : "Add to Ledger"}
            </button>
          </div>
        </div>
      )}

      {/* Take Item Modal */}
      {modalMode === "take" && targetEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm mx-4 border border-industrial/20">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-space-200 flex items-center gap-2">
                <Minus className="w-5 h-5 text-industrial" /> Take Item
              </h2>
              <button onClick={() => setModalMode(null)} className="text-space-500 hover:text-space-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="glass-card rounded-lg p-3 mb-4 border border-glass-border">
              <p className="text-sm font-medium text-space-200">{targetEntry.itemName}</p>
              <p className="text-[11px] text-space-500 mt-1">
                Available: <strong className="text-space-300">{targetEntry.quantity}</strong> units at {targetEntry.location}
              </p>
            </div>

            <div>
              <label className="text-xs text-space-400 mb-1 block">Quantity to Take</label>
              <input
                type="number"
                min={1}
                max={targetEntry.quantity}
                value={takeForm.quantity}
                onChange={(e) => setTakeForm({ quantity: Math.min(parseInt(e.target.value) || 1, targetEntry.quantity) })}
                className={inputClass}
              />
              <p className="text-[10px] text-space-600 mt-1">
                Taken by: <strong className="text-space-400">{user?.username}</strong>
              </p>
            </div>

            <button
              onClick={handleTakeItem}
              disabled={busy}
              className="w-full mt-5 py-2.5 bg-industrial/20 border border-industrial/40 text-industrial rounded-lg text-sm font-medium hover:bg-industrial/30 transition-all disabled:opacity-50"
            >
              {busy ? "Processing..." : "Confirm Take"}
            </button>
          </div>
        </div>
      )}

      {/* Delete Entry Modal */}
      {modalMode === "delete" && targetEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm mx-4 border border-danger/20">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-space-200 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-danger" /> Delete Entry
              </h2>
              <button onClick={() => setModalMode(null)} className="text-space-500 hover:text-space-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="glass-card rounded-lg p-3 mb-4 border border-glass-border">
              <p className="text-sm font-medium text-space-200">{targetEntry.itemName}</p>
              <p className="text-[11px] text-space-500 mt-1">
                {targetEntry.quantity} units at {targetEntry.location} — owned by {targetEntry.owner}
              </p>
            </div>

            <p className="text-xs text-space-400 mb-4">
              This will permanently remove this entry and its entire audit trail. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setModalMode(null)}
                className="flex-1 py-2.5 bg-space-800/50 border border-space-700/30 text-space-300 rounded-lg text-sm font-medium hover:bg-space-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEntry}
                disabled={busy}
                className="flex-1 py-2.5 bg-danger/20 border border-danger/40 text-danger rounded-lg text-sm font-medium hover:bg-danger/30 transition-all disabled:opacity-50"
              >
                {busy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Info Modal */}
      {modalMode === "info" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md mx-4 border border-holo/20">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-space-200 flex items-center gap-2">
                <Info className="w-5 h-5 text-holo" /> Item Details
              </h2>
              <button onClick={() => { setModalMode(null); setInfoItem(null); }} className="text-space-500 hover:text-space-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {infoItem ? (
              <>
                <div className="glass-card rounded-lg p-3 mb-4 border border-glass-border">
                  <h3 className="text-sm font-semibold text-space-200">{infoItem.Name}</h3>
                  <div className="flex gap-2 mt-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-holo/10 border border-holo/30 text-holo">
                      {getSubcategoryLabel(infoItem.subcategory)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {getItemStats(infoItem).map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-lg bg-space-900/40 border border-space-700/20 px-3 py-2"
                    >
                      <div className="text-[10px] text-space-500 uppercase tracking-wider">{label}</div>
                      <div className="text-sm font-medium text-space-200 font-mono mt-0.5">
                        {String(value ?? "—")}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Info className="w-8 h-8 text-space-700 mx-auto mb-2" />
                <p className="text-space-500 text-sm">Item not found in the database.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
