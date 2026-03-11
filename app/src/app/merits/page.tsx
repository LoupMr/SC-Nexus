"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Medal, Plus, Trash2, Loader2, X, CheckCircle2, Lock, ChevronDown,
  Warehouse, CheckCheck, Pencil, Check, Tag, Gift, Sparkles, ChevronUp, Users, Download,
} from "lucide-react";
import { useAuth } from "@/context/useAuth";
import PageHeader from "@/components/PageHeader";
import Portal from "@/components/Portal";
import { inputClass } from "@/lib/styles";

// --- Types ---

interface Merit {
  id: number;
  username: string;
  tag: string;
  operationId: string;
  operationName: string;
  awardedBy: string;
  awardedAt: string;
}

interface Operation {
  id: string;
  title: string;
  meritTag: string;
  status: string;
}

interface HangarCategory {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
}

interface HangarAsset {
  id: string;
  name: string;
  description: string;
  shipClass: string;
  requirementTag: string;
  sortOrder: number;
  categoryId: string;
  requirementCount?: number;
}

interface HangarSelection {
  id: string;
  username: string;
  assetId: string;
  assetName?: string;
  categoryId: string;
  selectedAt: string;
}

interface RafflePrize {
  assetId: string;
  assetName: string;
  winnerUsername: string | null;
  participantUsernames: string[];
}

interface Raffle {
  id: string;
  meritTag: string;
  status: string;
  createdAt: string;
  prizes: RafflePrize[];
}

interface Member {
  username: string;
  role: string;
  roles?: string[];
}

type ActiveTab = "record" | "hangar" | "award" | "raffle";

// --- Helpers ---

const TAG_PALETTE = [
  { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400" },
  { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" },
  { bg: "bg-holo/10",       border: "border-holo/30",       text: "text-holo"       },
  { bg: "bg-green-500/10",  border: "border-green-500/30",  text: "text-green-400"  },
  { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400" },
  { bg: "bg-pink-500/10",   border: "border-pink-500/30",   text: "text-pink-400"   },
];

function tagStyle(tag: string) {
  if (!tag) return TAG_PALETTE[2];
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = ((h << 5) - h) + tag.charCodeAt(i);
  return TAG_PALETTE[Math.abs(h) % TAG_PALETTE.length];
}

// --- Component ---

export default function MeritsPage() {
  const { user, isAdmin, canManageRaffle } = useAuth();

  // Data
  const [myMerits, setMyMerits]       = useState<Merit[]>([]);
  const [allMerits, setAllMerits]     = useState<Merit[]>([]);
  const [allAssets, setAllAssets]         = useState<HangarAsset[]>([]);
  const [categories, setCategories]       = useState<HangarCategory[]>([]);
  const [mySelections, setMySelections]   = useState<HangarSelection[]>([]);
  const [selectionsByAsset, setSelectionsByAsset] = useState<Record<string, string[]>>({});
  const [operations, setOperations]   = useState<Operation[]>([]);
  const [members, setMembers]         = useState<Member[]>([]);
  const [loading, setLoading]         = useState(true);

  // Tab
  const [tab, setTab] = useState<ActiveTab>("record");

  // Award merits state
  const [selectedOp, setSelectedOp]           = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch]       = useState("");
  const [memberDropOpen, setMemberDropOpen]   = useState(false);
  const [awardBusy, setAwardBusy]             = useState(false);
  const [awardSuccess, setAwardSuccess]       = useState("");
  const [awardError, setAwardError]           = useState("");

  // Edit merit tag on operation
  const [editingTagOpId, setEditingTagOpId] = useState<string | null>(null);
  const [editingTagValue, setEditingTagValue] = useState("");
  const [tagBusy, setTagBusy] = useState(false);

  // Revoke merit
  const [revokeId, setRevokeId] = useState<number | null>(null);

  // Hangar — request
  const [reqBusy, setReqBusy] = useState<string | null>(null);
  const [reqError, setReqError] = useState<string | null>(null);
  const [cancelReqBusy, setCancelReqBusy] = useState<string | null>(null);

  // Hangar — add asset modal
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [assetForm, setAssetForm] = useState({ name: "", description: "", shipClass: "", requirementTag: "", categoryId: "cat-executive", requirementCount: 2 });
  const [assetBusy, setAssetBusy] = useState(false);

  // Hangar — edit asset modal
  const [editingAsset, setEditingAsset] = useState<HangarAsset | null>(null);
  const [editAssetForm, setEditAssetForm] = useState({ name: "", description: "", shipClass: "", requirementTag: "", categoryId: "", requirementCount: 2 });
  const [editAssetBusy, setEditAssetBusy] = useState(false);

  // Hangar — delete asset
  const [deleteBusy, setDeleteBusy] = useState<string | null>(null);

  // Hangar — who selected dropdown
  const [expandedSelectionAsset, setExpandedSelectionAsset] = useState<string | null>(null);

  // Raffle
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [raffleForm, setRaffleForm] = useState({ meritTag: "", assetIds: [""] as string[] });
  const [raffleBusy, setRaffleBusy] = useState(false);
  const [drawBusy, setDrawBusy] = useState<string | null>(null);
  const [raffleEditId, setRaffleEditId] = useState<string | null>(null);
  const [raffleEditForm, setRaffleEditForm] = useState({ meritTag: "", assetIds: [] as string[] });
  const [raffleEditBusy, setRaffleEditBusy] = useState(false);
  const [raffleDeleteBusy, setRaffleDeleteBusy] = useState<string | null>(null);

  // --- Load ---

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const fetches: Promise<Response>[] = [
        fetch(`/api/merits/${encodeURIComponent(user.username)}`),
        fetch("/api/hangar"),
        fetch("/api/operations"),
        fetch("/api/raffles"),
      ];
      if (isAdmin) {
        fetches.push(fetch("/api/merits"));
        fetches.push(fetch("/api/members"));
      }
      const results = await Promise.all(fetches);
      if (results[0].ok) setMyMerits(await results[0].json());
      if (results[1].ok) {
        const hangar = await results[1].json();
        setAllAssets(hangar.assets ?? hangar);
        setCategories(hangar.categories ?? []);
        setMySelections(hangar.selections ?? []);
        setSelectionsByAsset(hangar.selectionsByAsset ?? {});
      }
      if (results[2].ok) setOperations(await results[2].json());
      if (results[3].ok) setRaffles(await results[3].json());
      if (isAdmin && results[4]?.ok) setAllMerits(await results[4].json());
      if (isAdmin && results[5]?.ok) setMembers(await results[5].json());
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => { load(); }, [load]);

  // --- Derived ---

  const myTags = [...new Set(myMerits.map((m) => m.tag))];
  const tagCounts = myMerits.reduce<Record<string, number>>((acc, m) => {
    acc[m.tag] = (acc[m.tag] ?? 0) + 1;
    return acc;
  }, {});

  const selectedOp_ = operations.find((o) => o.id === selectedOp);

  const getMySelectionForAsset = (assetId: string) =>
    mySelections.find((s) => s.assetId === assetId);

  // --- Handlers ---

  const handleAward = async () => {
    if (!selectedOp || selectedMembers.length === 0) return;
    setAwardBusy(true); setAwardError(""); setAwardSuccess("");
    const res = await fetch("/api/merits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationId: selectedOp, usernames: selectedMembers }),
    });
    setAwardBusy(false);
    const data = await res.json();
    if (res.ok) {
      setAwardSuccess(`Merit awarded to ${data.awarded} member${data.awarded !== 1 ? "s" : ""}.`);
      setSelectedOp(""); setSelectedMembers([]);
      load();
    } else {
      setAwardError(data.error || "Failed to award merit.");
    }
  };

  const handleRevoke = async (meritId: number) => {
    setRevokeId(meritId);
    await fetch(`/api/merits/${encodeURIComponent(user!.username)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: meritId }),
    });
    setRevokeId(null);
    load();
  };

  const handleSaveMeritTag = async (opId: string) => {
    setTagBusy(true);
    await fetch(`/api/operations/${opId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meritTag: editingTagValue.trim() }),
    });
    setTagBusy(false);
    setEditingTagOpId(null);
    load();
  };

  const handleSelect = async (assetId: string) => {
    setReqError(null);
    setReqBusy(assetId);
    const res = await fetch("/api/hangar/selections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId }),
    });
    const data = await res.json();
    setReqBusy(null);
    if (!res.ok) setReqError(data.error || "Selection failed");
    load();
  };

  const handleUnselect = async (assetId: string) => {
    setCancelReqBusy(assetId);
    await fetch(`/api/hangar/selections/${assetId}`, { method: "DELETE" });
    setCancelReqBusy(null);
    load();
  };

  const handleAddAsset = async () => {
    if (!assetForm.name || !assetForm.requirementTag) return;
    setAssetBusy(true);
    const res = await fetch("/api/hangar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assetForm),
    });
    setAssetBusy(false);
    if (res.ok) { setShowAddAsset(false); setAssetForm({ name: "", description: "", shipClass: "", requirementTag: "", categoryId: categories[0]?.id || "cat-executive", requirementCount: 2 }); load(); }
  };

  const handleDeleteAsset = async (id: string) => {
    setDeleteBusy(id);
    await fetch(`/api/hangar/${id}`, { method: "DELETE" });
    setDeleteBusy(null);
    load();
  };

  const openEditAsset = (asset: HangarAsset) => {
    setEditingAsset(asset);
    setEditAssetForm({ name: asset.name, description: asset.description, shipClass: asset.shipClass, requirementTag: asset.requirementTag, categoryId: asset.categoryId || "cat-executive", requirementCount: asset.requirementCount ?? 2 });
  };

  const handleEditAsset = async () => {
    if (!editingAsset) return;
    setEditAssetBusy(true);
    await fetch(`/api/hangar/${editingAsset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editAssetForm),
    });
    setEditAssetBusy(false);
    setEditingAsset(null);
    load();
  };

  const handleLaunchRaffle = async () => {
    const ids = raffleForm.assetIds.filter(Boolean);
    if (!raffleForm.meritTag || ids.length === 0) return;
    setRaffleBusy(true);
    const res = await fetch("/api/raffles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meritTag: raffleForm.meritTag, assetIds: ids }),
    });
    setRaffleBusy(false);
    if (res.ok) {
      setRaffleForm({ meritTag: "", assetIds: [""] });
      load();
    }
  };

  const handleAddCategory = async () => {
    if (!categoryForm.name) return;
    setCategoryBusy(true);
    const res = await fetch("/api/hangar/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(categoryForm),
    });
    setCategoryBusy(false);
    if (res.ok) { setShowAddCategory(false); setCategoryForm({ name: "", description: "" }); load(); }
  };

  const handleDrawRaffle = async (raffleId: string) => {
    setDrawBusy(raffleId);
    await fetch(`/api/raffles/${raffleId}/draw`, { method: "POST" });
    setDrawBusy(null);
    load();
  };

  const openEditRaffle = (r: Raffle) => {
    setRaffleEditId(r.id);
    setRaffleEditForm({ meritTag: r.meritTag, assetIds: r.prizes.map((p) => p.assetId) });
  };

  const handleEditRaffle = async () => {
    if (!raffleEditId) return;
    setRaffleEditBusy(true);
    const ids = raffleEditForm.assetIds.filter(Boolean);
    await fetch(`/api/raffles/${raffleEditId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meritTag: raffleEditForm.meritTag, assetIds: ids }),
    });
    setRaffleEditBusy(false);
    setRaffleEditId(null);
    load();
  };

  const handleDeleteRaffle = async (raffleId: string) => {
    setRaffleDeleteBusy(raffleId);
    await fetch(`/api/raffles/${raffleId}`, { method: "DELETE" });
    setRaffleDeleteBusy(null);
    load();
  };

  const toggleMember = (u: string) =>
    setSelectedMembers((p) => p.includes(u) ? p.filter((x) => x !== u) : [...p, u]);

  const filteredMembers = members.filter(
    (m) => m.username.toLowerCase().includes(memberSearch.toLowerCase()) && !selectedMembers.includes(m.username)
  );

  // --- Render ---

  if (loading) {
    return (
      <>
        <PageHeader icon={Medal} title="MERITS & REWARDS" subtitle="Service record, hangar access & participation awards" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-holo animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader icon={Medal} title="MERITS & REWARDS" subtitle="Service record, hangar access & participation awards" />

      {/* Tabs + Export */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div className="flex flex-wrap gap-2">
        {(["record", "hangar"] as ActiveTab[]).map((t) => (
          <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}>
            {t === "record" ? "Service Record" : <><Warehouse className="w-3.5 h-3.5" /> Rewards</>}
          </TabBtn>
        ))}
        {isAdmin && (
          <TabBtn active={tab === "award"} onClick={() => setTab("award")}>
            Award Merits
          </TabBtn>
        )}
        {canManageRaffle && (
          <TabBtn active={tab === "raffle"} onClick={() => setTab("raffle")}>
            <Gift className="w-3.5 h-3.5" /> Raffle
          </TabBtn>
        )}
      </div>
      <div className="flex gap-2">
        <a href="/api/export/merits?format=csv" className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-glass-border rounded-lg text-space-400 hover:text-holo transition-colors" download>
          <Download className="w-3.5 h-3.5" /> CSV
        </a>
        <a href="/api/export/merits?format=json" className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-glass-border rounded-lg text-space-400 hover:text-holo transition-colors" download>
          <Download className="w-3.5 h-3.5" /> JSON
        </a>
      </div>
      </div>

      {/* ── SERVICE RECORD ── */}
      {tab === "record" && (
        <div className="space-y-6">
          {/* Earned Merit Tags — home-page style stats grid */}
          <div>
            <h2 className="text-xs font-semibold text-space-400 uppercase tracking-wider mb-4">Earned Merit Tags</h2>
            {myTags.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <Medal className="w-10 h-10 text-space-700 mx-auto mb-2" />
                <p className="text-space-500 text-sm">No merit tags yet — participate in operations to earn them.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {myTags.map((tag) => {
                  const s = tagStyle(tag);
                  const count = tagCounts[tag] ?? 1;
                  return (
                    <div key={tag} className={`glass-card rounded-xl p-4 text-center border ${s.border}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 ${s.bg} border ${s.border}`}>
                        <Medal className={`w-5 h-5 ${s.text}`} />
                      </div>
                      <div className="text-2xl font-bold text-space-200 font-mono">{count}</div>
                      <div className={`text-[11px] font-medium uppercase tracking-wider ${s.text}`}>{tag.replace(/_/g, " ")}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Raffles — only in Service Record */}
          {raffles.length > 0 && (
            <div className="glass-card rounded-xl p-5">
              <h2 className="text-xs font-semibold text-space-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Gift className="w-4 h-4 text-holo" /> Raffles
              </h2>
              <p className="text-[11px] text-space-500 mb-4">Only members who have selected a reward (and spent merits) are eligible for its raffle. When drawn, a winner is chosen and selections reset so you can select again.</p>
              <div className="space-y-4">
                {raffles.map((r) => {
                  const s = tagStyle(r.meritTag);
                  const isOpen = r.status === "open";
                  const prizeNames = r.prizes.map((p) => p.assetName).join(", ");
                  return (
                    <div key={r.id} className="rounded-lg border border-glass-border bg-space-900/30 p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${s.bg} ${s.border} ${s.text}`}>
                          {r.meritTag.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm text-space-300">→ {prizeNames}</span>
                        {isOpen ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-holo/10 border border-holo/30 text-holo">Open</span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 border border-success/30 text-success">Closed</span>
                        )}
                      </div>
                      <div className="text-xs text-space-500 space-y-1">
                        {r.prizes.map((p) => {
                          const participants = p.participantUsernames ?? [];
                          return (
                            <p key={p.assetId}>
                              <span className="text-space-400 font-medium">{p.assetName}:</span>{" "}
                              {participants.length} eligible
                              {!isOpen && p.winnerUsername && (
                                <> — Winner: <span className="text-success font-semibold">{p.winnerUsername}</span></>
                              )}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Participation Log */}
          <div>
            <h2 className="text-xs font-semibold text-space-400 uppercase tracking-wider mb-3">Participation Log</h2>
            {myMerits.length === 0 ? (
              <div className="glass-card rounded-xl p-6 text-center">
                <Medal className="w-10 h-10 text-space-700 mx-auto mb-2" />
                <p className="text-space-500 text-sm">No participation logged yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myMerits.map((m) => {
                  const s = tagStyle(m.tag);
                  return (
                    <div key={m.id} className="glass-card rounded-lg px-4 py-3 flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0 ${s.bg} ${s.border} ${s.text}`}>
                        {m.tag.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm text-space-300 flex-1 min-w-0 truncate">{m.operationName}</span>
                      <span className="text-[11px] text-space-600 flex-shrink-0">{new Date(m.awardedAt).toLocaleDateString()}</span>
                      {isAdmin && (
                        <button onClick={() => handleRevoke(m.id)} disabled={revokeId === m.id} className="text-space-600 hover:text-danger transition-colors flex-shrink-0">
                          {revokeId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* All Members Merits — admin only */}
          {isAdmin && (
            <div>
              <h2 className="text-xs font-semibold text-space-400 uppercase tracking-wider mb-3">All Member Merits</h2>
              {allMerits.length === 0 ? (
                <p className="text-space-500 text-sm">No merits awarded yet.</p>
              ) : (
                <div className="space-y-2">
                  {allMerits.map((m) => {
                    const s = tagStyle(m.tag);
                    return (
                      <div key={m.id} className="glass-card rounded-lg px-4 py-3 flex items-center gap-3">
                        <span className="text-sm font-medium text-space-200 w-28 flex-shrink-0 truncate">{m.username}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0 ${s.bg} ${s.border} ${s.text}`}>
                          {m.tag.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-space-500 flex-1 truncate">{m.operationName}</span>
                        <span className="text-[11px] text-space-600 flex-shrink-0">{new Date(m.awardedAt).toLocaleDateString()}</span>
                        <button onClick={() => handleRevoke(m.id)} disabled={revokeId === m.id} className="text-space-600 hover:text-danger transition-colors flex-shrink-0">
                          {revokeId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── REWARDS (categories + assets) ── */}
      {tab === "hangar" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-space-500">Spend merits to select rewards — like buying with currency. Selecting consumes the required merits; deselecting refunds them. One reward per category.</p>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-space-800/60 border border-space-600/50 text-space-300 rounded-lg hover:bg-space-700/60 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Category
                </button>
                <button
                  onClick={() => setShowAddAsset(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-holo/10 border border-holo/30 text-holo rounded-lg hover:bg-holo/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Asset
                </button>
              </div>
            )}
          </div>

          {reqError && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger flex items-center justify-between">
              {reqError}
              <button onClick={() => setReqError(null)} className="text-danger/70 hover:text-danger"><X className="w-4 h-4" /></button>
            </div>
          )}

          {allAssets.length === 0 ? (
            <div className="text-center py-16">
              <Warehouse className="w-12 h-12 text-space-700 mx-auto mb-3" />
              <p className="text-space-500 text-sm">No assets yet. Add categories and assets to get started.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {(categories.length ? categories : [{ id: "uncat", name: "Assets", description: "", sortOrder: 0 }]).map((cat) => {
                const catAssets = allAssets.filter((a) => (a.categoryId || "cat-executive") === cat.id);
                if (catAssets.length === 0 && categories.length > 0) return null;
                const displayAssets = catAssets.length ? catAssets : allAssets;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-sm font-semibold text-space-300">{cat.name}</h3>
                      {cat.description && <span className="text-xs text-space-500">— {cat.description}</span>}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {displayAssets.map((asset) => {
                        const hasTag = !asset.requirementTag || myTags.includes(asset.requirementTag);
                        const count = asset.requirementTag ? (tagCounts[asset.requirementTag] ?? 0) : 0;
                        const reqCount = asset.requirementCount ?? 2;
                        const canSelect = hasTag && count >= reqCount;
                        const mySel = getMySelectionForAsset(asset.id);
                        const s = tagStyle(asset.requirementTag);
                return (
                  <div key={asset.id} className={`glass-card rounded-xl overflow-hidden flex flex-col border ${canSelect ? "border-success/20" : "border-space-700/30 opacity-75"}`}>
                    <div className="p-5 flex-1">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${canSelect ? "bg-success/10 border border-success/30" : "bg-space-800/60 border border-space-700/30"}`}>
                          {canSelect ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Lock className="w-5 h-5 text-space-600" />}
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditAsset(asset)} className="text-space-600 hover:text-holo transition-colors" title="Edit asset">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteAsset(asset.id)} disabled={deleteBusy === asset.id} className="text-space-600 hover:text-danger transition-colors" title="Delete asset">
                              {deleteBusy === asset.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        )}
                      </div>
                      <h3 className={`text-sm font-semibold mb-0.5 ${canSelect ? "text-space-200" : "text-space-500"}`}>{asset.name}</h3>
                      {asset.shipClass && <p className="text-[10px] text-space-600 mb-2">{asset.shipClass}</p>}
                      <p className="text-xs text-space-500 leading-relaxed mb-3">{asset.description}</p>
                      {asset.requirementTag && (
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${s.bg} ${s.border} ${s.text}`}>
                          {canSelect ? <CheckCircle2 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          {asset.requirementTag.replace(/_/g, " ")}
                          {hasTag && <span className="tabular-nums">{count}/{reqCount}</span>}
                        </div>
                      )}
                      {(selectionsByAsset[asset.id]?.length ?? 0) > 0 && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setExpandedSelectionAsset((p) => (p === asset.id ? null : asset.id))}
                            className="flex items-center gap-1.5 text-[11px] text-space-500 hover:text-space-300 transition-colors"
                          >
                            <Users className="w-3.5 h-3.5" />
                            {selectionsByAsset[asset.id].length} selected
                            {expandedSelectionAsset === asset.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          {expandedSelectionAsset === asset.id && (
                            <div className="mt-1.5 pl-5 space-y-0.5">
                              {selectionsByAsset[asset.id].map((u) => (
                                <div key={u} className="text-[11px] text-space-400">{u}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="px-5 py-3 border-t border-glass-border bg-space-900/30">
                      {mySel ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-success">
                            <CheckCheck className="w-4 h-4" /> Selected
                          </div>
                          <button
                            onClick={() => handleUnselect(asset.id)}
                            disabled={cancelReqBusy === asset.id}
                            className="text-xs text-space-500 hover:text-danger transition-colors"
                          >
                            {cancelReqBusy === asset.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Deselect"}
                          </button>
                        </div>
                      ) : canSelect ? (
                        <button
                          onClick={() => handleSelect(asset.id)}
                          disabled={reqBusy === asset.id}
                          className="flex items-center gap-1.5 text-xs font-medium text-holo hover:text-holo/80 transition-colors disabled:opacity-50"
                          title={`Spends ${reqCount} ${asset.requirementTag.replace(/_/g, " ")} merit${reqCount !== 1 ? "s" : ""}`}
                        >
                          {reqBusy === asset.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          Select ({reqCount} merit{reqCount !== 1 ? "s" : ""})
                        </button>
                      ) : hasTag && count < reqCount ? (
                        <span className="flex items-center gap-1.5 text-xs text-space-600">
                          Costs {reqCount} merits (you have {count})
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-space-600">
                          <Lock className="w-3.5 h-3.5" /> Earn the merit to unlock
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
          )}

          {/* Add Category Modal */}
          {showAddCategory && (
            <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowAddCategory(false)}>
              <div className="glass-card rounded-xl p-6 w-full max-w-md border border-glass-border" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-space-200">Add Category</h3>
                  <button onClick={() => setShowAddCategory(false)} className="text-space-500 hover:text-space-300"><X className="w-5 h-5" /></button>
                </div>
                <p className="text-xs text-space-500 mb-4">Create categories like Executive Hangar, Event Rewards, etc. Each can have its own assets and raffles.</p>
                <div className="space-y-4">
                  <Field label="Category Name">
                    <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Executive Hangar" className={inputClass} />
                  </Field>
                  <Field label="Description">
                    <input type="text" value={categoryForm.description} onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional" className={inputClass} />
                  </Field>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setShowAddCategory(false)} className="px-4 py-2 rounded-lg text-sm text-space-400 border border-space-700/50 hover:text-space-200">Cancel</button>
                  <button onClick={handleAddCategory} disabled={categoryBusy || !categoryForm.name} className="px-4 py-2 rounded-lg text-sm bg-holo/20 border border-holo/40 text-holo font-medium hover:bg-holo/30 disabled:opacity-50 flex items-center gap-2">
                    {categoryBusy && <Loader2 className="w-4 h-4 animate-spin" />} Add Category
                  </button>
                </div>
              </div>
            </div>
            </Portal>
          )}

          {/* Edit Asset Modal */}
          {editingAsset && (
            <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setEditingAsset(null)}>
              <div className="glass-card rounded-xl p-6 w-full max-w-md border border-glass-border" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-space-200">Edit Hangar Asset</h3>
                  <button onClick={() => setEditingAsset(null)} className="text-space-500 hover:text-space-300"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  <Field label="Asset Name">
                    <input type="text" value={editAssetForm.name} onChange={(e) => setEditAssetForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Origin 600i Executive Edition" className={inputClass} />
                  </Field>
                  <Field label="Ship Class">
                    <input type="text" value={editAssetForm.shipClass} onChange={(e) => setEditAssetForm((p) => ({ ...p, shipClass: e.target.value }))} placeholder="e.g. Origin 600i" className={inputClass} />
                  </Field>
                  <Field label="Description">
                    <textarea value={editAssetForm.description} onChange={(e) => setEditAssetForm((p) => ({ ...p, description: e.target.value }))} rows={2} className={`${inputClass} resize-none`} />
                  </Field>
                  <Field label="Required Merit Tag">
                    <select value={editAssetForm.requirementTag} onChange={(e) => setEditAssetForm((p) => ({ ...p, requirementTag: e.target.value }))} className={inputClass}>
                      <option value="">Select merit tag...</option>
                      {[...new Set([...operations.filter((o) => o.meritTag).map((o) => o.meritTag), editAssetForm.requirementTag].filter(Boolean))].map((tag) => (
                        <option key={tag} value={tag}>{tag.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Merit Amount Required">
                    <input type="number" min={1} value={editAssetForm.requirementCount} onChange={(e) => setEditAssetForm((p) => ({ ...p, requirementCount: Math.max(1, parseInt(e.target.value, 10) || 1) }))} className={inputClass} />
                  </Field>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setEditingAsset(null)} className="px-4 py-2 rounded-lg text-sm text-space-400 border border-space-700/50 hover:text-space-200">Cancel</button>
                  <button
                    onClick={handleEditAsset}
                    disabled={editAssetBusy || !editAssetForm.name || !editAssetForm.requirementTag}
                    className="px-4 py-2 rounded-lg text-sm bg-holo/20 border border-holo/40 text-holo font-medium hover:bg-holo/30 disabled:opacity-50 flex items-center gap-2"
                  >
                    {editAssetBusy && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
                  </button>
                </div>
              </div>
            </div>
            </Portal>
          )}

          {/* Add Asset Modal */}
          {showAddAsset && (
            <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowAddAsset(false)}>
              <div className="glass-card rounded-xl p-6 w-full max-w-md border border-glass-border" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-space-200">Add Hangar Asset</h3>
                  <button onClick={() => setShowAddAsset(false)} className="text-space-500 hover:text-space-300"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  <Field label="Asset Name">
                    <input type="text" value={assetForm.name} onChange={(e) => setAssetForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Origin 600i Executive Edition" className={inputClass} />
                  </Field>
                  <Field label="Ship Class">
                    <input type="text" value={assetForm.shipClass} onChange={(e) => setAssetForm((p) => ({ ...p, shipClass: e.target.value }))} placeholder="e.g. Origin 600i" className={inputClass} />
                  </Field>
                  <Field label="Description">
                    <textarea value={assetForm.description} onChange={(e) => setAssetForm((p) => ({ ...p, description: e.target.value }))} rows={2} className={`${inputClass} resize-none`} />
                  </Field>
                  <Field label="Category">
                    <select value={assetForm.categoryId} onChange={(e) => setAssetForm((p) => ({ ...p, categoryId: e.target.value }))} className={inputClass}>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Required Merit Tag">
                    <select value={assetForm.requirementTag} onChange={(e) => setAssetForm((p) => ({ ...p, requirementTag: e.target.value }))} className={inputClass}>
                      <option value="">Select merit tag...</option>
                      {[...new Set(operations.filter((o) => o.meritTag).map((o) => o.meritTag))].map((tag) => (
                        <option key={tag} value={tag}>{tag.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Merit Amount Required">
                    <input type="number" min={1} value={assetForm.requirementCount} onChange={(e) => setAssetForm((p) => ({ ...p, requirementCount: Math.max(1, parseInt(e.target.value, 10) || 1) }))} className={inputClass} />
                    <p className="text-[11px] text-space-600 mt-1">User needs this many merits of the tag to select this reward.</p>
                  </Field>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setShowAddAsset(false)} className="px-4 py-2 rounded-lg text-sm text-space-400 border border-space-700/50 hover:text-space-200">Cancel</button>
                  <button
                    onClick={handleAddAsset}
                    disabled={assetBusy || !assetForm.name || !assetForm.requirementTag}
                    className="px-4 py-2 rounded-lg text-sm bg-holo/20 border border-holo/40 text-holo font-medium hover:bg-holo/30 disabled:opacity-50 flex items-center gap-2"
                  >
                    {assetBusy && <Loader2 className="w-4 h-4 animate-spin" />} Add Asset
                  </button>
                </div>
              </div>
            </div>
            </Portal>
          )}
        </div>
      )}

      {/* ── AWARD MERITS (admin) ── */}
      {tab === "award" && isAdmin && (
        <div className="space-y-6">
          {/* Operations & Their Merit Tags */}
          <div>
            <h2 className="text-xs font-semibold text-space-400 uppercase tracking-wider mb-3">Operations & Merit Tags</h2>
            <p className="text-xs text-space-500 mb-4">Each operation awards a merit tag when participated in. Click the edit icon to assign or change the tag for any operation.</p>
            <div className="space-y-2">
              {operations.map((op) => {
                const isEditing = editingTagOpId === op.id;
                const s = tagStyle(op.meritTag);
                return (
                  <div key={op.id} className="glass-card rounded-lg px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-space-200 font-medium">{op.title}</span>
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <input
                          type="text"
                          value={editingTagValue}
                          onChange={(e) => setEditingTagValue(e.target.value)}
                          placeholder="e.g. Pyro_Veteran"
                          className="px-2 py-1 text-xs bg-space-900 border border-holo/40 rounded text-space-200 focus:outline-none w-36"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveMeritTag(op.id); if (e.key === "Escape") setEditingTagOpId(null); }}
                        />
                        <button onClick={() => handleSaveMeritTag(op.id)} disabled={tagBusy} className="text-success hover:text-success/80 transition-colors">
                          {tagBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setEditingTagOpId(null)} className="text-space-500 hover:text-space-300 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {op.meritTag ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${s.bg} ${s.border} ${s.text}`}>
                            <Tag className="w-3 h-3" />{op.meritTag.replace(/_/g, " ")}
                          </span>
                        ) : (
                          <span className="text-[11px] text-space-600 italic">No merit tag</span>
                        )}
                        <button
                          onClick={() => { setEditingTagOpId(op.id); setEditingTagValue(op.meritTag || ""); }}
                          className="text-space-600 hover:text-holo transition-colors"
                          title="Edit merit tag"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {operations.length === 0 && (
                <p className="text-space-500 text-sm">No operations found. Create operations in the Operation Guide first.</p>
              )}
            </div>
          </div>

          {/* Award Form */}
          <div className="max-w-lg">
            <h2 className="text-xs font-semibold text-space-400 uppercase tracking-wider mb-3">Log Participation</h2>
            <div className="glass-card rounded-xl p-6 space-y-5">
              {/* Operation Select */}
              <Field label="Operation">
                <select value={selectedOp} onChange={(e) => setSelectedOp(e.target.value)} className={inputClass}>
                  <option value="">Select an operation...</option>
                  {operations.filter((o) => o.meritTag).map((op) => (
                    <option key={op.id} value={op.id}>{op.title} → {op.meritTag.replace(/_/g, " ")}</option>
                  ))}
                </select>
                {selectedOp_ && (
                  <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border ${tagStyle(selectedOp_.meritTag).bg} ${tagStyle(selectedOp_.meritTag).border} ${tagStyle(selectedOp_.meritTag).text}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Awards: {selectedOp_.meritTag.replace(/_/g, " ")}
                  </div>
                )}
                {!selectedOp_ && (
                  <p className="text-[11px] text-space-600 mt-1">Only operations with a merit tag appear here. Use the list above to assign tags.</p>
                )}
              </Field>

              {/* Member Multi-Select */}
              <Field label="Participating Members">
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedMembers.map((u) => (
                      <span key={u} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-holo/10 border border-holo/30 text-holo text-xs">
                        {u} <button onClick={() => toggleMember(u)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <button type="button" onClick={() => setMemberDropOpen(!memberDropOpen)} className={`${inputClass} flex items-center justify-between text-left`}>
                    <span className={selectedMembers.length ? "text-space-200" : "text-space-600"}>
                      {selectedMembers.length ? `${selectedMembers.length} selected` : "Select members..."}
                    </span>
                    <ChevronDown className="w-4 h-4 text-space-500 flex-shrink-0" />
                  </button>
                  {memberDropOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-space-900 border border-glass-border rounded-lg shadow-xl overflow-hidden">
                      <div className="p-2 border-b border-glass-border">
                        <input type="text" placeholder="Search members..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                          className="w-full px-2 py-1.5 bg-space-800 border border-space-700/50 rounded text-xs text-space-200 focus:outline-none" autoFocus />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredMembers.length === 0
                          ? <p className="text-xs text-space-500 text-center py-3">No members found</p>
                          : filteredMembers.map((m) => (
                            <button key={m.username} type="button" onClick={() => { toggleMember(m.username); setMemberSearch(""); }}
                              className="w-full text-left px-3 py-2 text-sm text-space-300 hover:bg-space-800/60 hover:text-space-200 transition-colors">
                              {m.username} <span className="ml-2 text-[10px] text-space-600">{(m.roles ?? [m.role]).join(", ")}</span>
                            </button>
                          ))
                        }
                      </div>
                      <div className="p-2 border-t border-glass-border">
                        <button type="button" onClick={() => setMemberDropOpen(false)} className="w-full text-xs text-space-500 hover:text-space-300 py-1">Done</button>
                      </div>
                    </div>
                  )}
                </div>
              </Field>

              {awardError   && <p className="text-xs text-danger">{awardError}</p>}
              {awardSuccess && <p className="text-xs text-success">{awardSuccess}</p>}

              <button
                onClick={handleAward}
                disabled={awardBusy || !selectedOp || selectedMembers.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-holo/20 border border-holo/40 text-holo rounded-lg text-sm font-medium hover:bg-holo/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {awardBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Medal className="w-4 h-4" />}
                Award Merit to {selectedMembers.length || 0} Member{selectedMembers.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RAFFLE (admin) ── */}
      {tab === "raffle" && canManageRaffle && (
        <div className="space-y-6">
          <div className="glass-card rounded-xl p-6 max-w-lg">
            <h2 className="text-xs font-semibold text-space-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-holo" /> Launch Raffle
            </h2>
            <p className="text-xs text-space-500 mb-4">Select a merit tag and a prize from the hangar. Only members who have selected that reward are eligible for the draw.</p>
            <p className="text-[11px] text-space-600 mb-4">Winner selection: <span className="text-space-500">Uniform random</span> — one eligible member is chosen at random with equal probability.</p>
            <div className="space-y-4">
              <Field label="Merit Tag">
                <select value={raffleForm.meritTag} onChange={(e) => setRaffleForm((p) => ({ ...p, meritTag: e.target.value }))} className={inputClass}>
                  <option value="">Select merit tag...</option>
                  {[...new Set(operations.filter((o) => o.meritTag).map((o) => o.meritTag))].map((tag) => (
                    <option key={tag} value={tag}>{tag.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </Field>
              <Field label="Prizes (Ship or Asset)">
                <div className="space-y-2">
                  {raffleForm.assetIds.map((aid, i) => (
                    <div key={aid} className="flex items-center gap-2">
                      <select
                        value={aid}
                        onChange={(e) => setRaffleForm((p) => ({ ...p, assetIds: p.assetIds.map((id, j) => (j === i ? e.target.value : id)) }))}
                        className={inputClass}
                      >
                        <option value="">Select prize...</option>
                        {allAssets.map((a) => (
                          <option key={a.id} value={a.id}>{a.name} {a.shipClass && `(${a.shipClass})`}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setRaffleForm((p) => ({ ...p, assetIds: p.assetIds.filter((_, j) => j !== i) }))}
                        className="p-1.5 rounded text-space-500 hover:text-danger"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRaffleForm((p) => ({ ...p, assetIds: [...p.assetIds, ""] }))}
                    className="text-xs text-holo hover:text-holo/80 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add prize
                  </button>
                </div>
              </Field>
              <button
                onClick={handleLaunchRaffle}
                disabled={raffleBusy || !raffleForm.meritTag || raffleForm.assetIds.length === 0 || raffleForm.assetIds.some((id) => !id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-holo/20 border border-holo/40 text-holo rounded-lg text-sm font-medium hover:bg-holo/30 disabled:opacity-50"
              >
                {raffleBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />} Launch Raffle
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-space-400 uppercase tracking-wider mb-3">Active & Past Raffles</h2>
            {raffles.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <Gift className="w-12 h-12 text-space-700 mx-auto mb-3" />
                <p className="text-space-500 text-sm">No raffles yet. Launch one above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {raffles.map((r) => {
                  const s = tagStyle(r.meritTag);
                  const prizeNames = r.prizes.map((p) => p.assetName).join(", ");
                  const winnerText = r.prizes.filter((p) => p.winnerUsername).map((p) => `${p.assetName}: ${p.winnerUsername}`).join("; ");
                  return (
                    <div key={r.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${s.bg} ${s.border} ${s.text}`}>
                        {r.meritTag.replace(/_/g, " ")}
                      </div>
                      <span className="text-sm text-space-300 flex-1">→ {prizeNames}</span>
                      {r.status === "open" ? (
                        <button
                          onClick={() => handleDrawRaffle(r.id)}
                          disabled={drawBusy === r.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-success/10 border border-success/30 text-success hover:bg-success/20 disabled:opacity-50"
                        >
                          {drawBusy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Draw Winner
                        </button>
                      ) : (
                        <span className="text-xs text-success font-medium">Winners: {winnerText || "—"}</span>
                      )}
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditRaffle(r)} className="p-1.5 rounded-lg text-space-500 hover:text-holo transition-colors" title="Edit raffle">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteRaffle(r.id)} disabled={raffleDeleteBusy === r.id} className="p-1.5 rounded-lg text-space-500 hover:text-danger transition-colors" title="Delete raffle">
                          {raffleDeleteBusy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Raffle Modal */}
      {raffleEditId && (
        <Portal>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setRaffleEditId(null)}>
          <div className="glass-card rounded-xl p-6 w-full max-w-md border border-glass-border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-space-200">Edit Raffle</h3>
              <button onClick={() => setRaffleEditId(null)} className="text-space-500 hover:text-space-300"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <Field label="Merit Tag">
                <select value={raffleEditForm.meritTag} onChange={(e) => setRaffleEditForm((p) => ({ ...p, meritTag: e.target.value }))} className={inputClass}>
                  <option value="">Select merit tag...</option>
                  {[...new Set(operations.filter((o) => o.meritTag).map((o) => o.meritTag))].map((tag) => (
                    <option key={tag} value={tag}>{tag.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </Field>
              <Field label="Prizes (Ship or Asset)">
                <div className="space-y-2">
                  {raffleEditForm.assetIds.map((aid, i) => (
                    <div key={`${aid}-${i}`} className="flex items-center gap-2">
                      <select
                        value={aid}
                        onChange={(e) => setRaffleEditForm((p) => ({ ...p, assetIds: p.assetIds.map((id, j) => (j === i ? e.target.value : id)) }))}
                        className={inputClass}
                      >
                        <option value="">Select prize...</option>
                        {allAssets.map((a) => (
                          <option key={a.id} value={a.id}>{a.name} {a.shipClass && `(${a.shipClass})`}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setRaffleEditForm((p) => ({ ...p, assetIds: p.assetIds.filter((_, j) => j !== i) }))}
                        className="p-1.5 rounded text-space-500 hover:text-danger"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRaffleEditForm((p) => ({ ...p, assetIds: [...p.assetIds, ""] }))}
                    className="text-xs text-holo hover:text-holo/80 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add prize
                  </button>
                </div>
              </Field>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setRaffleEditId(null)} className="px-4 py-2 rounded-lg text-sm text-space-400 border border-space-700/50 hover:text-space-200">Cancel</button>
              <button
                onClick={handleEditRaffle}
                disabled={raffleEditBusy || !raffleEditForm.meritTag || raffleEditForm.assetIds.length === 0 || raffleEditForm.assetIds.some((id) => !id)}
                className="px-4 py-2 rounded-lg text-sm bg-holo/20 border border-holo/40 text-holo font-medium hover:bg-holo/30 disabled:opacity-50 flex items-center gap-2"
              >
                {raffleEditBusy && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </>
  );
}

// --- Small helper components ---

function TabBtn({ active, onClick, children, badge }: { active: boolean; onClick: () => void; children: React.ReactNode; badge?: number }) {
  return (
    <button onClick={onClick} className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${active ? "bg-holo/10 border-holo/30 text-holo" : "border-space-700/50 text-space-400 hover:text-space-200"}`}>
      {children}
      {badge != null && badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-danger text-white text-[9px] flex items-center justify-center font-bold">{badge}</span>
      )}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-space-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
