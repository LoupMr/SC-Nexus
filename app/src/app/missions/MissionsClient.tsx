"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, X, ClipboardList, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";
import PageHeader from "@/components/PageHeader";
import MissionDetailModal from "@/components/MissionDetailModal";
import {
  gameVersionLabel,
  payloadToTableRows,
  type MissionTableRow,
  type ScmdbMissionPayload,
} from "@/lib/missions";

const PAGE_SIZE = 120;
const DATA_URL = "/data/mission_data.json";

type SortKey = "title" | "reward" | "baseXp" | "system" | "faction" | "missionType";
type SortDir = "asc" | "desc";

function sortOpt(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function parseRewardNum(r: string): number {
  const n = Number(r.replace(/[^0-9]/g, ""));
  return Number.isFinite(n) ? n : -1;
}

const MISSION_TYPE_COLORS: Record<string, string> = {
  Delivery: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Mercenary: "bg-red-500/15 text-red-300 border-red-500/30",
  Bounty: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  Investigation: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  Maintenance: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  Salvage: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Priority: "bg-pink-500/15 text-pink-300 border-pink-500/30",
};

function missionTypeColor(type: string): string {
  for (const [key, cls] of Object.entries(MISSION_TYPE_COLORS)) {
    if (type.toLowerCase().includes(key.toLowerCase())) return cls;
  }
  if (type.toLowerCase().includes("haul"))
    return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  if (type.toLowerCase().includes("mining"))
    return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
  return "bg-space-700/30 text-space-400 border-space-600/30";
}

function MissionCard({ row, onClick }: { row: MissionTableRow; onClick: () => void }) {
  const typeClr = missionTypeColor(row.missionType);
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-full text-left chamfer-sm border bg-space-900/50 transition-all duration-200 group overflow-hidden",
        row.legal === "✗"
          ? "border-alert/20 hover:border-alert/40 hover:shadow-[0_0_16px_rgba(255,75,106,0.1)]"
          : "border-glass-border hover:border-holo/35 hover:shadow-[0_0_16px_rgba(92,225,230,0.08)]"
      )}
    >
      <div className="p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-space-100 group-hover:text-holo transition-colors line-clamp-1 mobiglas-label">
              {row.title}
            </h3>
            <p className="text-[11px] text-space-500 mt-0.5 truncate">{row.faction}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-sm font-semibold text-amber-200/90 tabular-nums">
              {row.reward !== "—" ? row.reward : ""}
            </span>
            {row.baseXp !== "—" ? (
              <p className="text-[10px] text-space-500 mt-0.5">{row.baseXp} XP</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={clsx("text-[10px] px-2 py-0.5 chamfer-sm border font-medium", typeClr)}>
            {row.missionType}
          </span>
          {row.system !== "—" ? (
            <span className="text-[10px] px-2 py-0.5 chamfer-sm border border-space-600/40 bg-space-800/40 text-space-400 font-medium">
              {row.system}
            </span>
          ) : null}
          {row.legal === "✗" ? (
            <span className="text-[10px] px-2 py-0.5 chamfer-sm border border-alert/30 bg-alert/10 text-alert font-medium">
              ILLEGAL
            </span>
          ) : null}
          {row.tags.includes("SOLO") ? (
            <span className="text-[10px] px-2 py-0.5 chamfer-sm border border-space-600/40 bg-space-800/30 text-space-500">
              SOLO
            </span>
          ) : null}
          {row.tags.includes("UNQ") ? (
            <span className="text-[10px] px-2 py-0.5 chamfer-sm border border-violet-500/30 bg-violet-500/10 text-violet-300">
              UNIQUE
            </span>
          ) : null}
          {row.hasBlueprints ? (
            <span className="text-[10px] px-2 py-0.5 chamfer-sm border border-holo/30 bg-holo/10 text-holo font-medium">
              BP
            </span>
          ) : null}
          {row.inOut !== "—" && !row.inOut.endsWith("BP") ? (
            <span className="text-[10px] px-1.5 py-0.5 text-space-500 font-mono">{row.inOut}</span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function FilterPill({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "text-xs px-3 py-1.5 chamfer-sm border transition-all duration-150 mobiglas-label whitespace-nowrap",
        active
          ? "bg-holo/15 border-holo/40 text-holo shadow-[0_0_8px_rgba(92,225,230,0.2)]"
          : "bg-space-900/40 border-glass-border text-space-400 hover:border-holo/25 hover:text-space-300"
      )}
    >
      {label}
      {count !== undefined ? (
        <span className={clsx("ml-1.5 tabular-nums", active ? "text-holo/70" : "text-space-600")}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

export default function MissionsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const search = searchParams.get("search") ?? "";
  const system = searchParams.get("system") ?? "all";
  const missionType = searchParams.get("type") ?? "all";
  const faction = searchParams.get("faction") ?? "all";
  const legal = searchParams.get("legal") ?? "all";
  const blueprints = searchParams.get("bp") ?? "all";
  const deferredSearch = useDeferredValue(search);

  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "all") p.delete(key);
        else p.set(key, value);
      }
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const [payload, setPayload] = useState<ScmdbMissionPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleCap, setVisibleCap] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<MissionTableRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(DATA_URL);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = (await res.json()) as ScmdbMissionPayload;
        if (!cancelled) { setPayload(json); setLoadError(null); }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load missions");
          setPayload(null);
        }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const allRows = useMemo(() => (payload ? payloadToTableRows(payload) : []), [payload]);

  const systemOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of allRows) {
      if (r.system !== "—") for (const part of r.system.split(",").map((x) => x.trim())) if (part) s.add(part);
    }
    return [...s].sort(sortOpt);
  }, [allRows]);

  const typeOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of allRows) if (r.missionType !== "—") s.add(r.missionType);
    return [...s].sort(sortOpt);
  }, [allRows]);

  const factionOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of allRows) if (r.faction !== "—") s.add(r.faction);
    return [...s].sort(sortOpt);
  }, [allRows]);

  const typeCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of allRows) { const t = r.missionType; m.set(t, (m.get(t) || 0) + 1); }
    return m;
  }, [allRows]);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return allRows.filter((r) => {
      if (q) {
        const hay = `${r.title} ${r.faction} ${r.missionType} ${r.raw.debugName ?? ""} ${r.id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (system !== "all" && (r.system === "—" || !r.system.split(",").map((x) => x.trim()).includes(system))) return false;
      if (missionType !== "all" && r.missionType !== missionType) return false;
      if (faction !== "all" && r.faction !== faction) return false;
      if (legal === "legal" && r.legal !== "✓") return false;
      if (legal === "illegal" && r.legal !== "✗") return false;
      if (blueprints === "yes" && !r.hasBlueprints) return false;
      if (blueprints === "no" && r.hasBlueprints) return false;
      return true;
    });
  }, [allRows, deferredSearch, system, missionType, faction, legal, blueprints]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "title": cmp = a.title.localeCompare(b.title); break;
        case "faction": cmp = a.faction.localeCompare(b.faction); break;
        case "system": cmp = a.system.localeCompare(b.system); break;
        case "missionType": cmp = a.missionType.localeCompare(b.missionType); break;
        case "reward": cmp = parseRewardNum(a.reward) - parseRewardNum(b.reward); break;
        case "baseXp": {
          const xa = typeof a.baseXp === "number" ? a.baseXp : -1;
          const xb = typeof b.baseXp === "number" ? b.baseXp : -1;
          cmp = xa - xb; break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [filtered, sortKey, sortDir]);

  useEffect(() => { setVisibleCap(PAGE_SIZE); }, [search, system, missionType, faction, legal, blueprints]);

  const visible = sorted.slice(0, visibleCap);
  const canLoadMore = visibleCap < sorted.length;

  const clearFilters = () => {
    setParams({ search: null, system: null, type: null, faction: null, legal: null, bp: null });
  };

  const activeFilters =
    (search ? 1 : 0) + (system !== "all" ? 1 : 0) + (missionType !== "all" ? 1 : 0) +
    (faction !== "all" ? 1 : 0) + (legal !== "all" ? 1 : 0) + (blueprints !== "all" ? 1 : 0);

  const headerSubtitle = useMemo(() => {
    if (!payload) return "Star Citizen contract data (SCMDb merge)";
    const ver = gameVersionLabel(payload);
    let s = `${allRows.length} contracts · ${ver}`;
    const aug = payload._meta?.blueprintAugmentedFrom;
    if (aug) s += ` · BP from PTU ${aug}`;
    return s;
  }, [allRows.length, payload]);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }, [sortKey]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-space-500">
        <div className="w-8 h-8 border-2 border-holo/30 border-t-holo rounded-full animate-spin" />
        <span className="text-sm mobiglas-label">Loading mission database…</span>
      </div>
    );
  }

  if (loadError || !payload) {
    return (
      <div className="space-y-4">
        <PageHeader title="Missions" subtitle="Star Citizen contract data (SCMDb merge)" icon={ClipboardList} />
        <div className="chamfer-sm border border-alert/30 bg-alert/5 text-alert-200/90 px-4 py-3 text-sm">
          <p className="font-medium">Could not load mission data</p>
          <p className="text-space-400 mt-1 text-xs">
            {loadError ?? "Unknown error"}. Run{" "}
            <code className="text-holo/90">npm run fetch-missions</code> to populate.
          </p>
        </div>
      </div>
    );
  }

  function SortBtn({ k, children }: { k: SortKey; children: React.ReactNode }) {
    const active = sortKey === k;
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={clsx("inline-flex items-center gap-1 hover:text-holo transition-colors", active && "text-holo")}
      >
        {children}
        {active ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
      </button>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Missions" subtitle={headerSubtitle} icon={ClipboardList} />

      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500 pointer-events-none" />
          <input
            type="search"
            placeholder="Search missions…"
            value={search}
            onChange={(e) => setParams({ search: e.target.value || null })}
            autoComplete="off"
            className="w-full pl-10 pr-10 py-2.5 chamfer-sm bg-space-900/60 border border-glass-border text-sm text-space-200 placeholder:text-space-600 focus:outline-none focus:border-holo/40 focus:ring-1 focus:ring-holo/20 transition-all"
          />
          {search ? (
            <button type="button" onClick={() => setParams({ search: null })} className="absolute right-3 top-1/2 -translate-y-1/2 text-space-500 hover:text-space-300" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className={clsx(
            "chamfer-sm border px-3 py-2.5 text-sm transition-all flex items-center gap-2 shrink-0",
            filtersOpen || activeFilters > 0
              ? "bg-holo/10 border-holo/40 text-holo"
              : "bg-space-900/60 border-glass-border text-space-400 hover:border-holo/30 hover:text-space-300"
          )}
        >
          Filters
          {activeFilters > 0 ? (
            <span className="bg-holo/20 text-holo text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-semibold">
              {activeFilters}
            </span>
          ) : null}
        </button>
        {activeFilters > 0 ? (
          <button type="button" onClick={clearFilters} className="chamfer-sm border border-glass-border text-space-400 hover:text-alert hover:border-alert/30 px-2.5 py-2.5 transition-all" aria-label="Reset filters">
            <RotateCcw className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {/* Expandable filter panel */}
      {filtersOpen ? (
        <div className="chamfer-sm border border-glass-border bg-space-900/40 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Mission type pills */}
          <div>
            <label className="text-[10px] text-space-500 uppercase tracking-wider mobiglas-label block mb-2">Mission type</label>
            <div className="flex flex-wrap gap-1.5">
              <FilterPill label="All" active={missionType === "all"} onClick={() => setParams({ type: null })} />
              {typeOptions.map((t) => (
                <FilterPill key={t} label={t} active={missionType === t} onClick={() => setParams({ type: t })} count={typeCounts.get(t)} />
              ))}
            </div>
          </div>

          {/* System + Faction + Legal + BP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-space-500 uppercase tracking-wider mobiglas-label block mb-1.5">System</label>
              <select value={system} onChange={(e) => setParams({ system: e.target.value })} className="w-full chamfer-sm bg-space-900/60 border border-glass-border text-sm text-space-200 py-2 px-3" aria-label="System">
                <option value="all">All systems</option>
                {systemOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-space-500 uppercase tracking-wider mobiglas-label block mb-1.5">Faction</label>
              <select value={faction} onChange={(e) => setParams({ faction: e.target.value })} className="w-full chamfer-sm bg-space-900/60 border border-glass-border text-sm text-space-200 py-2 px-3" aria-label="Faction">
                <option value="all">All factions</option>
                {factionOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-space-500 uppercase tracking-wider mobiglas-label block mb-1.5">Legal status</label>
              <div className="flex gap-1.5">
                <FilterPill label="All" active={legal === "all"} onClick={() => setParams({ legal: null })} />
                <FilterPill label="Legal" active={legal === "legal"} onClick={() => setParams({ legal: "legal" })} />
                <FilterPill label="Illegal" active={legal === "illegal"} onClick={() => setParams({ legal: "illegal" })} />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-space-500 uppercase tracking-wider mobiglas-label block mb-1.5">Blueprints</label>
              <div className="flex gap-1.5">
                <FilterPill label="All" active={blueprints === "all"} onClick={() => setParams({ bp: null })} />
                <FilterPill label="Has BP" active={blueprints === "yes"} onClick={() => setParams({ bp: "yes" })} />
                <FilterPill label="No BP" active={blueprints === "no"} onClick={() => setParams({ bp: "no" })} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Status bar */}
      <div className="flex items-center justify-between text-xs text-space-500 mobiglas-label">
        <span>
          {filtered.length === allRows.length
            ? `${allRows.length} missions`
            : `${filtered.length} of ${allRows.length} missions`}
        </span>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-space-600">Sort:</span>
          <SortBtn k="title">Title</SortBtn>
          <SortBtn k="reward">Reward</SortBtn>
          <SortBtn k="baseXp">XP</SortBtn>
          <SortBtn k="system">System</SortBtn>
        </div>
      </div>

      {/* Card grid */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((r) => (
          <MissionCard key={`${r.kind}-${r.id}`} row={r} onClick={() => setSelected(r)} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-space-500 text-sm">
          No missions match your filters.
          {activeFilters > 0 ? (
            <button type="button" onClick={clearFilters} className="text-holo hover:underline ml-2">Clear all</button>
          ) : null}
        </div>
      ) : null}

      {canLoadMore ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setVisibleCap((c) => c + PAGE_SIZE)}
            className="chamfer-sm border border-holo/40 text-holo hover:bg-holo/10 text-sm py-2.5 px-8 mobiglas-label transition-all duration-200"
          >
            Show more ({sorted.length - visibleCap} remaining)
          </button>
        </div>
      ) : null}

      <MissionDetailModal row={selected} payload={payload} onClose={() => setSelected(null)} />
    </div>
  );
}
