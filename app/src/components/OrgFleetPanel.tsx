"use client";

import Image from "next/image";
import clsx from "clsx";
import { getShipBySlug } from "@/lib/ships";
import type { FleetAcquisitionFilter } from "@/hooks/useShipHangar";

export type OrgFleetEntry = {
  username: string;
  shipSlug: string;
  acquisition: "pledge" | "ingame";
  updatedAt: string;
};

function FleetFilterPill({
  label,
  value,
  current,
  onSelect,
}: {
  label: string;
  value: FleetAcquisitionFilter;
  current: FleetAcquisitionFilter;
  onSelect: (v: FleetAcquisitionFilter) => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={clsx(
        "text-xs px-3 py-1.5 chamfer-sm border transition-all mobiglas-label",
        active
          ? "bg-holo/15 border-holo/40 text-holo"
          : "bg-space-900/40 border-glass-border text-space-400 hover:border-holo/25 hover:text-space-300"
      )}
    >
      {label}
    </button>
  );
}

export default function OrgFleetPanel({
  entries,
  acquisitionFilter,
  onAcquisitionFilterChange,
  loading,
}: {
  entries: OrgFleetEntry[];
  acquisitionFilter: FleetAcquisitionFilter;
  onAcquisitionFilterChange: (v: FleetAcquisitionFilter) => void;
  loading: boolean;
}) {
  const filtered =
    acquisitionFilter === "all"
      ? entries
      : entries.filter((e) => e.acquisition === acquisitionFilter);

  const bySlug = new Map<string, OrgFleetEntry[]>();
  for (const e of filtered) {
    if (!bySlug.has(e.shipSlug)) bySlug.set(e.shipSlug, []);
    bySlug.get(e.shipSlug)!.push(e);
  }

  const slugs = [...bySlug.keys()].sort((a, b) => {
    const na = getShipBySlug(a)?.name ?? a;
    const nb = getShipBySlug(b)?.name ?? b;
    return na.localeCompare(nb);
  });

  const pledgeCount = entries.filter((e) => e.acquisition === "pledge").length;
  const ingameCount = entries.filter((e) => e.acquisition === "ingame").length;

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-space-500 text-sm mobiglas-label">Loading org fleet…</div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-space-500 uppercase tracking-wider mobiglas-label mr-1">Show</span>
        <FleetFilterPill label="All" value="all" current={acquisitionFilter} onSelect={onAcquisitionFilterChange} />
        <FleetFilterPill
          label={`Pledged (${pledgeCount})`}
          value="pledge"
          current={acquisitionFilter}
          onSelect={onAcquisitionFilterChange}
        />
        <FleetFilterPill
          label={`In-game (${ingameCount})`}
          value="ingame"
          current={acquisitionFilter}
          onSelect={onAcquisitionFilterChange}
        />
      </div>

      <p className="text-space-600 text-xs mobiglas-label">
        {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        {acquisitionFilter !== "all" ? ` (filtered)` : ""} · {slugs.length} distinct hull
        {slugs.length !== 1 ? "s" : ""}
      </p>

      {slugs.length === 0 ? (
        <div className="text-center py-16 text-space-500 text-sm border border-glass-border chamfer-md bg-space-900/30 px-4">
          No ships match this filter. Members can add hulls under{" "}
          <strong className="text-space-400">My matrix</strong> while signed in.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {slugs.map((slug) => {
            const rows = bySlug.get(slug)!;
            const ship = getShipBySlug(slug);
            const title = ship?.name ?? slug;
            return (
              <article
                key={slug}
                className="chamfer-md border border-glass-border bg-space-900/40 overflow-hidden flex flex-col"
              >
                <div className="relative h-32 bg-space-900/60 border-b border-glass-border shrink-0">
                  {ship?.storeImage ? (
                    <Image
                      src={ship.storeImage}
                      alt=""
                      fill
                      className="object-contain p-2"
                      sizes="(max-width: 640px) 100vw, 33vw"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-space-600 text-xs mobiglas-label">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col gap-2 min-w-0">
                  <div>
                    <h3 className="text-sm font-semibold text-space-200 mobiglas-label truncate">{title}</h3>
                    {ship?.manufacturer ? (
                      <p className="text-[11px] text-space-500 truncate">{ship.manufacturer}</p>
                    ) : null}
                  </div>
                  <ul className="space-y-1.5">
                    {rows
                      .slice()
                      .sort((a, b) => a.username.localeCompare(b.username, undefined, { sensitivity: "base" }))
                      .map((r, i) => (
                        <li
                          key={`${r.username}-${i}`}
                          className="flex items-center justify-between gap-2 text-[11px]"
                        >
                          <span className="text-space-300 truncate">{r.username}</span>
                          <span
                            className={clsx(
                              "shrink-0 px-2 py-0.5 chamfer-sm border text-[10px] font-semibold mobiglas-label",
                              r.acquisition === "pledge"
                                ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
                                : "bg-holo/10 text-holo border-holo/30"
                            )}
                          >
                            {r.acquisition === "pledge" ? "PLEDGED" : "IN-GAME"}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
