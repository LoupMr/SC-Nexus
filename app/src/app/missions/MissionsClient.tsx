"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, X, ClipboardList } from "lucide-react";
import clsx from "clsx";
import PageHeader from "@/components/PageHeader";
import MissionDetailModal from "@/components/MissionDetailModal";
import {
  gameVersionLabel,
  payloadToTableRows,
  type MissionTableRow,
  type ScmdbMissionPayload,
} from "@/lib/missions";

const PAGE_SIZE = 150;
const DATA_URL = "/data/mission_data.json";

function sortOpt(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
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
        if (!cancelled) {
          setPayload(json);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load missions");
          setPayload(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allRows = useMemo(() => (payload ? payloadToTableRows(payload) : []), [payload]);

  const systemOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of allRows) {
      if (r.system && r.system !== "—") {
        for (const part of r.system.split(",").map((x) => x.trim())) {
          if (part) s.add(part);
        }
      }
    }
    return ["all", ...[...s].sort(sortOpt)];
  }, [allRows]);

  const typeOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of allRows) {
      if (r.missionType && r.missionType !== "—") s.add(r.missionType);
    }
    return ["all", ...[...s].sort(sortOpt)];
  }, [allRows]);

  const factionOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of allRows) {
      if (r.faction && r.faction !== "—") s.add(r.faction);
    }
    return ["all", ...[...s].sort(sortOpt)];
  }, [allRows]);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return allRows.filter((r) => {
      if (q) {
        const hay = `${r.title} ${r.faction} ${r.missionType} ${r.raw.debugName ?? ""} ${r.id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (system !== "all") {
        if (r.system === "—" || !r.system.split(",").map((x) => x.trim()).includes(system)) {
          return false;
        }
      }
      if (missionType !== "all" && r.missionType !== missionType) return false;
      if (faction !== "all" && r.faction !== faction) return false;
      if (legal === "legal" && r.legal !== "✓") return false;
      if (legal === "illegal" && r.legal !== "✗") return false;
      if (blueprints === "yes" && !r.hasBlueprints) return false;
      if (blueprints === "no" && r.hasBlueprints) return false;
      return true;
    });
  }, [allRows, deferredSearch, system, missionType, faction, legal, blueprints]);

  useEffect(() => {
    setVisibleCap(PAGE_SIZE);
  }, [search, system, missionType, faction, legal, blueprints]);

  const visible = filtered.slice(0, visibleCap);
  const canLoadMore = visibleCap < filtered.length;

  const clearFilters = () => {
    setParams({
      search: null,
      system: null,
      type: null,
      faction: null,
      legal: null,
      bp: null,
    });
  };

  const activeFilters =
    (search ? 1 : 0) +
    (system !== "all" ? 1 : 0) +
    (missionType !== "all" ? 1 : 0) +
    (faction !== "all" ? 1 : 0) +
    (legal !== "all" ? 1 : 0) +
    (blueprints !== "all" ? 1 : 0);

  const headerSubtitle = useMemo(() => {
    if (!payload) return "Star Citizen contract data (SCMDb merge)";
    const ver = gameVersionLabel(payload);
    let s = `${allRows.length} contracts · SCMDb · ${ver}`;
    const aug = payload._meta?.blueprintAugmentedFrom;
    if (aug) s += ` · blueprint data from PTU ${aug}`;
    return s;
  }, [allRows.length, payload]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-space-500 text-sm mobiglas-label">
        Loading mission database…
      </div>
    );
  }

  if (loadError || !payload) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Missions"
          subtitle="Star Citizen contract data (SCMDb merge)"
          icon={ClipboardList}
        />
        <div className="chamfer-sm border border-alert/30 bg-alert/5 text-alert-200/90 px-4 py-3 text-sm">
          <p className="font-medium">Could not load mission data</p>
          <p className="text-space-400 mt-1 text-xs">
            {loadError ?? "Unknown error"}. Run{" "}
            <code className="text-holo/90">npm run fetch-missions</code> from{" "}
            <code className="text-holo/90">app/</code> to download{" "}
            <code className="text-holo/90">public/data/mission_data.json</code>. Use{" "}
            <code className="text-holo/90">npm run fetch-missions:live-only</code> for raw live only
            (no PTU blueprint merge).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Missions" subtitle={headerSubtitle} icon={ClipboardList} />

      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500 pointer-events-none" />
            <input
              type="search"
              placeholder="Search title, faction, type, debug name, id…"
              value={search}
              onChange={(e) => setParams({ search: e.target.value || null })}
              autoComplete="off"
              className="w-full pl-10 pr-10 py-2.5 chamfer-sm bg-space-900/60 border border-glass-border text-sm text-space-200 placeholder:text-space-600 focus:outline-none focus:border-holo/40 focus:ring-1 focus:ring-holo/20"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setParams({ search: null })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-space-500 hover:text-space-300"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={system}
              onChange={(e) => setParams({ system: e.target.value })}
              className="chamfer-sm bg-space-900/60 border border-glass-border text-sm text-space-200 py-2.5 px-3 min-w-[8rem]"
              aria-label="Filter by system"
            >
              {systemOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "all" ? "All systems" : opt}
                </option>
              ))}
            </select>
            <select
              value={missionType}
              onChange={(e) => setParams({ type: e.target.value })}
              className="chamfer-sm bg-space-900/60 border border-glass-border text-sm text-space-200 py-2.5 px-3 min-w-[9rem]"
              aria-label="Filter by mission type"
            >
              {typeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "all" ? "All types" : opt}
                </option>
              ))}
            </select>
            <select
              value={faction}
              onChange={(e) => setParams({ faction: e.target.value })}
              className="chamfer-sm bg-space-900/60 border border-glass-border text-sm text-space-200 py-2.5 px-3 min-w-[10rem]"
              aria-label="Filter by faction"
            >
              {factionOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "all" ? "All factions" : opt}
                </option>
              ))}
            </select>
            <select
              value={legal}
              onChange={(e) => setParams({ legal: e.target.value })}
              className="chamfer-sm bg-space-900/60 border border-glass-border text-sm text-space-200 py-2.5 px-3 min-w-[7rem]"
              aria-label="Filter by legal"
            >
              <option value="all">Legal: all</option>
              <option value="legal">Legal only</option>
              <option value="illegal">Illegal only</option>
            </select>
            <select
              value={blueprints}
              onChange={(e) => setParams({ bp: e.target.value })}
              className="chamfer-sm bg-space-900/60 border border-glass-border text-sm text-space-200 py-2.5 px-3 min-w-[8rem]"
              aria-label="Filter by blueprint rewards"
            >
              <option value="all">Prints: all</option>
              <option value="yes">Has 🔧BP</option>
              <option value="no">No prints</option>
            </select>
            {activeFilters > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="chamfer-sm border border-glass-border text-space-400 hover:text-holo hover:border-holo/40 text-sm py-2.5 px-3 mobiglas-label"
              >
                Reset ({activeFilters})
              </button>
            ) : null}
          </div>
        </div>

        <p className="text-xs text-space-500 mobiglas-label">
          Showing {visible.length} of {filtered.length} matching · {allRows.length} total
        </p>
      </div>

      <div className="hidden lg:block overflow-x-auto border border-glass-border chamfer-sm bg-space-900/40">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-glass-border text-space-500 text-xs mobiglas-label uppercase tracking-wider">
              <th className="p-3 w-28">System</th>
              <th className="p-3 min-w-[200px]">Title</th>
              <th className="p-3 w-36">Faction</th>
              <th className="p-3 w-32">Type</th>
              <th className="p-3 w-24">Tags</th>
              <th className="p-3 w-28">IN/OUT</th>
              <th className="p-3 w-16 text-right">XP</th>
              <th className="p-3 w-28 text-right">Reward</th>
              <th className="p-3 w-12">Leg</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={`${r.kind}-${r.id}`}
                className="border-b border-glass-border/60 hover:bg-holo/5 cursor-pointer transition-colors"
                onClick={() => setSelected(r)}
              >
                <td className="p-3 text-space-400 align-top whitespace-nowrap">{r.system}</td>
                <td className="p-3 text-space-200 align-top">{r.title}</td>
                <td className="p-3 text-space-400 align-top">{r.faction}</td>
                <td className="p-3 text-space-400 align-top text-xs">{r.missionType}</td>
                <td className="p-3 text-space-500 align-top text-xs">{r.tags}</td>
                <td className="p-3 text-space-500 align-top text-xs font-mono">{r.inOut}</td>
                <td className="p-3 text-right text-space-400 align-top">{r.baseXp}</td>
                <td className="p-3 text-right text-amber-200/80 align-top text-xs whitespace-nowrap">
                  {r.reward}
                </td>
                <td className="p-3 text-center align-top">{r.legal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden space-y-2">
        {visible.map((r) => (
          <button
            key={`${r.kind}-${r.id}`}
            type="button"
            onClick={() => setSelected(r)}
            className={clsx(
              "w-full text-left chamfer-sm border border-glass-border bg-space-900/50 p-3",
              "hover:border-holo/35 hover:bg-holo/5 transition-colors"
            )}
          >
            <div className="flex justify-between gap-2">
              <span className="text-space-200 text-sm font-medium line-clamp-2">{r.title}</span>
              <span className="text-amber-200/80 text-xs shrink-0">{r.reward}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-space-500">
              <span>{r.system}</span>
              <span>·</span>
              <span>{r.faction}</span>
              <span>·</span>
              <span>{r.missionType}</span>
              <span>·</span>
              <span>{r.legal}</span>
              {r.hasBlueprints ? (
                <>
                  <span>·</span>
                  <span className="text-holo/90">🔧BP</span>
                </>
              ) : null}
            </div>
          </button>
        ))}
      </div>

      {canLoadMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCap((c) => c + PAGE_SIZE)}
            className="chamfer-sm border border-holo/40 text-holo hover:bg-holo/10 text-sm py-2.5 px-6 mobiglas-label transition-colors"
          >
            Load more
          </button>
        </div>
      ) : null}

      <MissionDetailModal row={selected} payload={payload} onClose={() => setSelected(null)} />
    </div>
  );
}
