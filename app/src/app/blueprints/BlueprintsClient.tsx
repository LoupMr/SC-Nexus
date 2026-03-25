"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ScrollText, Search, X, RotateCcw, ChevronRight, Wrench, Factory } from "lucide-react";
import clsx from "clsx";
import PageHeader from "@/components/PageHeader";
import {
  gameVersionLabel,
  extractBlueprintPools,
  extractBlueprintItems,
  BLUEPRINT_INGAME_CRAFT_SUMMARY,
  type ScmdbMissionPayload,
  type BlueprintCatalogItem,
  type BlueprintPoolView,
  type BlueprintDropSource,
} from "@/lib/missions";
import {
  findCatalogItemByName,
  getItemStats,
  getCategoryLabel,
  getSubcategoryLabel,
} from "@/lib/database";

const DATA_URL = "/data/mission_data.json";

type ViewMode = "items" | "pools";

function resolvePoolFilterParam(param: string, pools: BlueprintPoolView[]): string {
  if (param === "all" || !param) return "all";
  if (pools.some((p) => p.poolId === param)) return param;
  const byHuman = pools.find((p) => p.poolName === param);
  if (byHuman) return byHuman.poolId;
  const byRaw = pools.find((p) => p.poolNameRaw === param);
  if (byRaw) return byRaw.poolId;
  return "all";
}

function formatStatValue(value: unknown): string {
  if (typeof value === "number") {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString();
  }
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function DropSourceRow({ src }: { src: BlueprintDropSource }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 px-2 chamfer-sm hover:bg-space-800/40 transition-colors text-xs">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span
          className={clsx(
            "w-1.5 h-1.5 rounded-full shrink-0",
            src.legal ? "bg-emerald-400" : "bg-alert"
          )}
        />
        <span className="text-space-200 truncate">{src.contractTitle}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 text-space-500">
        <span className="text-[10px] px-1.5 py-0.5 chamfer-sm border border-space-600/30 bg-space-800/30">
          {src.missionType}
        </span>
        {src.system !== "—" ? (
          <span className="text-[10px] px-1.5 py-0.5 chamfer-sm border border-space-600/30 bg-space-800/30">
            {src.system}
          </span>
        ) : null}
        <span
          className={clsx(
            "text-[10px] px-1.5 py-0.5 chamfer-sm border font-medium tabular-nums",
            src.chance >= 0.5
              ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
              : src.chance >= 0.2
                ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
                : "text-space-400 border-space-600/30 bg-space-800/30"
          )}
        >
          {src.chance <= 1 ? `${Math.round(src.chance * 100)}%` : src.chance}
        </span>
      </div>
    </div>
  );
}

function BlueprintItemCard({ item }: { item: BlueprintCatalogItem }) {
  const [expanded, setExpanded] = useState(false);
  const dbItem = useMemo(() => findCatalogItemByName(item.name), [item.name]);
  const stats = useMemo(() => (dbItem ? getItemStats(dbItem).slice(0, 8) : []), [dbItem]);

  return (
    <div
      className={clsx(
        "chamfer-sm border bg-space-900/50 transition-all duration-200 overflow-hidden",
        "border-holo/15 hover:border-holo/30 hover:shadow-[0_0_16px_rgba(92,225,230,0.06)]"
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((o) => !o)}
        className="w-full text-left p-3.5 sm:p-4 flex items-start gap-3"
      >
        <div className="w-9 h-9 chamfer-sm flex items-center justify-center shrink-0 bg-holo/10 border border-holo/20 text-holo mt-0.5">
          <Wrench className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-space-100 line-clamp-2 mobiglas-label">{item.name}</h3>
          <p className="text-[11px] text-space-400 mt-0.5 line-clamp-2">{item.poolName}</p>
          {item.poolNameRaw ? (
            <p className="text-[10px] text-space-600 font-mono mt-0.5 truncate" title={item.poolNameRaw}>
              {item.poolNameRaw}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {dbItem ? (
            <span className="text-[10px] px-2 py-0.5 chamfer-sm border border-emerald-500/25 bg-emerald-500/10 text-emerald-300/90 font-medium">
              In Armory
            </span>
          ) : null}
          <span className="text-[10px] px-2 py-0.5 chamfer-sm border border-holo/20 bg-holo/5 text-holo/80 font-medium tabular-nums">
            {item.dropSources.length} source{item.dropSources.length !== 1 ? "s" : ""}
          </span>
          <ChevronRight
            className={clsx("w-4 h-4 text-space-600 transition-transform duration-200", expanded && "rotate-90")}
          />
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-glass-border bg-space-black/25 space-y-3 px-3 py-3">
          <div className="chamfer-sm border border-amber-500/20 bg-amber-500/[0.06] p-3">
            <div className="flex items-center gap-2 text-amber-200/90 text-[10px] uppercase tracking-wider mobiglas-label mb-1.5">
              <Factory className="w-3.5 h-3.5" />
              Craft &amp; use
            </div>
            <p className="text-xs text-space-400 leading-relaxed">{BLUEPRINT_INGAME_CRAFT_SUMMARY}</p>
          </div>

          {dbItem ? (
            <div className="chamfer-sm border border-glass-border bg-space-900/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className="text-[10px] text-space-500 uppercase tracking-wider mobiglas-label">
                  Armory profile
                </p>
                <Link
                  href={`/armory?search=${encodeURIComponent(item.name)}`}
                  className="text-[11px] text-holo hover:underline mobiglas-label"
                >
                  Open in Armory →
                </Link>
              </div>
              <p className="text-[11px] text-space-500 mb-2">
                {getCategoryLabel(dbItem.category)} · {getSubcategoryLabel(dbItem.subcategory)}
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {stats.map((s) => (
                  <div key={s.label} className="flex justify-between gap-2 text-[11px]">
                    <span className="text-space-500 truncate">{s.label}</span>
                    <span className="text-space-300 font-mono tabular-nums shrink-0">
                      {formatStatValue(s.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-space-600 px-1">
              No matching Armory entry for this exact name — stats and fabricator compatibility may still match in-game.
            </p>
          )}

          {item.dropSources.length > 0 ? (
            <div>
              <p className="text-[10px] text-space-600 uppercase tracking-wider mobiglas-label px-1 pb-1">
                Drops from these contracts
              </p>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {item.dropSources.map((src, i) => (
                  <DropSourceRow key={`${src.contractId}-${i}`} src={src} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-space-600 px-1">No known drop sources in current dataset.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function PoolCard({ pool }: { pool: BlueprintPoolView }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={clsx(
        "chamfer-sm border bg-space-900/50 transition-all duration-200 overflow-hidden",
        "border-violet-500/15 hover:border-violet-500/30 hover:shadow-[0_0_16px_rgba(139,92,246,0.06)]"
      )}
    >
      <button type="button" onClick={() => setExpanded((o) => !o)} className="w-full text-left p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-space-100 line-clamp-2 mobiglas-label">{pool.poolName}</h3>
            {pool.poolNameRaw ? (
              <p className="text-[10px] text-space-600 font-mono mt-0.5 truncate" title={pool.poolNameRaw}>
                {pool.poolNameRaw}
              </p>
            ) : (
              <p className="text-[10px] text-space-600 font-mono mt-0.5 truncate">{pool.poolId}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] px-2 py-0.5 chamfer-sm border border-holo/20 bg-holo/5 text-holo/80 font-medium tabular-nums">
              {pool.items.length} item{pool.items.length !== 1 ? "s" : ""}
            </span>
            <span className="text-[10px] px-2 py-0.5 chamfer-sm border border-violet-500/20 bg-violet-500/5 text-violet-300/80 font-medium tabular-nums">
              {pool.dropSources.length} source{pool.dropSources.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {pool.items.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {pool.items.slice(0, expanded ? pool.items.length : 8).map((it, i) => (
              <span
                key={`${it.name}-${i}`}
                className="text-[10px] px-2 py-0.5 chamfer-sm border border-glass-border bg-space-800/40 text-space-300"
              >
                {it.name}
              </span>
            ))}
            {!expanded && pool.items.length > 8 ? (
              <span className="text-[10px] px-2 py-0.5 text-space-600">+{pool.items.length - 8} more</span>
            ) : null}
          </div>
        ) : (
          <p className="text-[10px] text-space-600">Item list not available in dataset</p>
        )}
      </button>

      {expanded ? (
        <div className="border-t border-glass-border bg-space-black/20 px-3 py-2 space-y-2 max-h-72 overflow-y-auto">
          <div className="chamfer-sm border border-amber-500/15 bg-amber-500/[0.05] p-2.5">
            <p className="text-[10px] text-amber-200/80 uppercase tracking-wider mobiglas-label mb-1">Craft &amp; use</p>
            <p className="text-[11px] text-space-500 leading-relaxed">{BLUEPRINT_INGAME_CRAFT_SUMMARY}</p>
          </div>
          <p className="text-[10px] text-space-600 uppercase tracking-wider mobiglas-label px-2">Drop sources</p>
          {pool.dropSources.length > 0 ? (
            pool.dropSources.map((src, i) => <DropSourceRow key={`${src.contractId}-${i}`} src={src} />)
          ) : (
            <p className="text-xs text-space-600 px-2 py-1">No known drop sources.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function BlueprintsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const search = searchParams.get("search") ?? "";
  const poolParam = searchParams.get("pool") ?? "all";
  const view = (searchParams.get("view") as ViewMode) || "items";
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
          setLoadError(e instanceof Error ? e.message : "Failed to load data");
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

  const allPools = useMemo(() => (payload ? extractBlueprintPools(payload) : []), [payload]);
  const allItems = useMemo(() => (payload ? extractBlueprintItems(payload) : []), [payload]);

  const effectivePool = useMemo(
    () => resolvePoolFilterParam(poolParam, allPools),
    [poolParam, allPools]
  );

  const filteredItems = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return allItems.filter((it) => {
      if (q) {
        const hay = `${it.name} ${it.poolName} ${it.poolNameRaw ?? ""} ${it.dropSources.map((d) => d.contractTitle).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (effectivePool !== "all" && it.poolId !== effectivePool) return false;
      return true;
    });
  }, [allItems, deferredSearch, effectivePool]);

  const filteredPools = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return allPools.filter((pv) => {
      if (q) {
        const hay = `${pv.poolName} ${pv.poolNameRaw ?? ""} ${pv.items.map((i) => i.name).join(" ")} ${pv.dropSources.map((d) => d.contractTitle).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (effectivePool !== "all" && pv.poolId !== effectivePool) return false;
      return true;
    });
  }, [allPools, deferredSearch, effectivePool]);

  const activeFilters = (search ? 1 : 0) + (effectivePool !== "all" ? 1 : 0);

  const clearFilters = () => {
    setParams({ search: null, pool: null });
  };

  const headerSubtitle = useMemo(() => {
    if (!payload) return "Blueprint catalog from SCMDb mission data";
    const ver = gameVersionLabel(payload);
    const aug = payload._meta?.blueprintAugmentedFrom;
    let s = `${allItems.length} blueprints in ${allPools.length} pools · ${ver}`;
    if (aug) s += ` · BP data from PTU ${aug}`;
    return s;
  }, [payload, allItems.length, allPools.length]);

  const totalSources = useMemo(() => {
    const ids = new Set<string>();
    for (const it of allItems) for (const d of it.dropSources) ids.add(d.contractId);
    return ids.size;
  }, [allItems]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-space-500">
        <div className="w-8 h-8 border-2 border-holo/30 border-t-holo rounded-full animate-spin" />
        <span className="text-sm mobiglas-label">Loading blueprint data…</span>
      </div>
    );
  }

  if (loadError || !payload) {
    return (
      <div className="space-y-4">
        <PageHeader title="BLUEPRINTS HUB" subtitle="Blueprint catalog from SCMDb mission data" icon={ScrollText} />
        <div className="chamfer-sm border border-alert/30 bg-alert/5 text-alert-200/90 px-4 py-3 text-sm">
          <p className="font-medium">Could not load blueprint data</p>
          <p className="text-space-400 mt-1 text-xs">
            {loadError ?? "Unknown error"}. Run{" "}
            <code className="text-holo/90">npm run fetch-missions</code> to populate.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="BLUEPRINTS HUB" subtitle={headerSubtitle} icon={ScrollText} />

      <p className="text-space-500 text-sm max-w-3xl leading-relaxed">
        Pool names from SCMDb are shown as readable titles. Expand any print for how crafting works in-game and, when the name matches our Armory dump, size/grade/type stats.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="chamfer-sm border border-glass-border bg-space-900/40 p-3 text-center">
          <p className="text-lg font-bold text-holo tabular-nums">{allItems.length}</p>
          <p className="text-[10px] text-space-500 uppercase tracking-wider mobiglas-label">Blueprints</p>
        </div>
        <div className="chamfer-sm border border-glass-border bg-space-900/40 p-3 text-center">
          <p className="text-lg font-bold text-violet-300 tabular-nums">{allPools.length}</p>
          <p className="text-[10px] text-space-500 uppercase tracking-wider mobiglas-label">Pools</p>
        </div>
        <div className="chamfer-sm border border-glass-border bg-space-900/40 p-3 text-center">
          <p className="text-lg font-bold text-amber-200 tabular-nums">{totalSources}</p>
          <p className="text-[10px] text-space-500 uppercase tracking-wider mobiglas-label">Contracts</p>
        </div>
        <div className="chamfer-sm border border-glass-border bg-space-900/40 p-3 text-center">
          <p className="text-lg font-bold text-emerald-300 tabular-nums">
            {payload._meta?.blueprintAugmentedFrom ? "PTU" : "Live"}
          </p>
          <p className="text-[10px] text-space-500 uppercase tracking-wider mobiglas-label">Source</p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500 pointer-events-none" />
          <input
            type="search"
            placeholder="Search prints, readable pool names, or missions…"
            value={search}
            onChange={(e) => setParams({ search: e.target.value || null })}
            autoComplete="off"
            className="w-full pl-10 pr-10 py-2.5 chamfer-sm bg-space-900/60 border border-glass-border text-sm text-space-200 placeholder:text-space-600 focus:outline-none focus:border-holo/40 focus:ring-1 focus:ring-holo/20 transition-all"
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

        <div className="flex chamfer-sm overflow-hidden border border-glass-border shrink-0">
          <button
            type="button"
            onClick={() => setParams({ view: "items" })}
            className={clsx(
              "px-3 py-2.5 text-xs transition-all mobiglas-label",
              view === "items"
                ? "bg-holo/15 text-holo border-r border-holo/30"
                : "bg-space-900/60 text-space-400 border-r border-glass-border hover:text-space-300"
            )}
          >
            Items
          </button>
          <button
            type="button"
            onClick={() => setParams({ view: "pools" })}
            className={clsx(
              "px-3 py-2.5 text-xs transition-all mobiglas-label",
              view === "pools" ? "bg-holo/15 text-holo" : "bg-space-900/60 text-space-400 hover:text-space-300"
            )}
          >
            Pools
          </button>
        </div>

        {activeFilters > 0 ? (
          <button
            type="button"
            onClick={clearFilters}
            className="chamfer-sm border border-glass-border text-space-400 hover:text-alert hover:border-alert/30 px-2.5 py-2.5 transition-all"
            aria-label="Reset filters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {allPools.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setParams({ pool: null })}
            className={clsx(
              "text-[11px] px-2.5 py-1 chamfer-sm border transition-all mobiglas-label",
              effectivePool === "all"
                ? "bg-holo/15 border-holo/40 text-holo"
                : "bg-space-900/40 border-glass-border text-space-400 hover:border-holo/25 hover:text-space-300"
            )}
          >
            All pools
          </button>
          {allPools.map((p) => (
            <button
              key={p.poolId}
              type="button"
              onClick={() => setParams({ pool: p.poolId })}
              className={clsx(
                "text-[11px] px-2.5 py-1 chamfer-sm border transition-all mobiglas-label truncate max-w-[220px]",
                effectivePool === p.poolId
                  ? "bg-violet-500/15 border-violet-500/40 text-violet-300"
                  : "bg-space-900/40 border-glass-border text-space-400 hover:border-violet-500/25 hover:text-space-300"
              )}
              title={p.poolNameRaw ?? p.poolName}
            >
              {p.poolName}
            </button>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-space-500 mobiglas-label">
        {view === "items"
          ? filteredItems.length === allItems.length
            ? `${allItems.length} blueprints`
            : `${filteredItems.length} of ${allItems.length} blueprints`
          : filteredPools.length === allPools.length
            ? `${allPools.length} pools`
            : `${filteredPools.length} of ${allPools.length} pools`}
      </p>

      {view === "items" ? (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((it, i) => (
            <BlueprintItemCard key={`${it.poolId}-${it.name}-${i}`} item={it} />
          ))}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPools.map((pv) => (
            <PoolCard key={pv.poolId} pool={pv} />
          ))}
        </div>
      )}

      {(view === "items" ? filteredItems.length : filteredPools.length) === 0 ? (
        <div className="text-center py-16 text-space-500 text-sm">
          No blueprints match your search.
          {activeFilters > 0 ? (
            <button type="button" onClick={clearFilters} className="text-holo hover:underline ml-2">
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
