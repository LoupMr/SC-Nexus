"use client";

import { useEffect, useMemo } from "react";
import { X, MapPin, Users, Crosshair, Coins, Star, Scale, Wrench, ScrollText } from "lucide-react";
import clsx from "clsx";
import {
  flattenDescription,
  gameVersionLabel,
  resolveContractBlueprints,
  BLUEPRINT_INGAME_CRAFT_SUMMARY,
  type MissionTableRow,
  type ScmdbMissionPayload,
} from "@/lib/missions";

type Props = {
  row: MissionTableRow | null;
  payload: ScmdbMissionPayload | null;
  onClose: () => void;
};

function StatBlock({ icon: Icon, label, value, accent }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="chamfer-sm border border-glass-border bg-space-black/30 p-3 flex items-start gap-3">
      <div className={clsx("w-8 h-8 chamfer-sm flex items-center justify-center shrink-0 border", accent || "bg-space-800/40 border-space-700/40")}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-space-500 uppercase tracking-wider mobiglas-label">{label}</p>
        <p className="text-sm text-space-200 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center text-[10px] px-2 py-0.5 chamfer-sm border font-medium", className)}>
      {children}
    </span>
  );
}

export default function MissionDetailModal({ row, payload, onClose }: Props) {
  useEffect(() => {
    if (!row) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [row, onClose]);

  const rawJson = useMemo(() => {
    if (!row) return "";
    try { return JSON.stringify(row.raw, null, 2); } catch { return ""; }
  }, [row]);

  const resolvedBlueprints = useMemo(() => {
    if (!row || !payload) return [];
    return resolveContractBlueprints(row.raw, payload.blueprintPools);
  }, [row, payload]);

  if (!row) return null;

  const desc = flattenDescription(row.raw.description);
  const rewardNum = row.reward !== "—" ? row.reward : null;
  const hasBuyIn = row.raw.buyIn != null && Number(row.raw.buyIn) > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-space-black/75 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mission-detail-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div
        className={clsx(
          "relative z-10 w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col",
          "chamfer-sm border border-glass-border bg-space-900/98 shadow-[0_0_32px_rgba(92,225,230,0.1)]",
          "rounded-t-lg sm:rounded-lg"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-glass-border">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={row.legal === "✗"
                ? "bg-alert/10 text-alert border-alert/30"
                : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              }>
                {row.legal === "✗" ? "ILLEGAL" : "LEGAL"}
              </Badge>
              <Badge className="bg-space-800/40 text-space-500 border-space-600/40">
                {row.kind === "legacy" ? "Legacy" : "Contract"}
              </Badge>
            </div>
            <h2 id="mission-detail-title" className="text-lg font-bold text-space-100 leading-tight">
              {row.title}
            </h2>
            {row.raw.debugName ? (
              <p className="text-[11px] text-space-600 font-mono mt-1 truncate" title={row.raw.debugName}>
                {row.raw.debugName}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 chamfer-sm border border-glass-border text-space-400 hover:text-holo hover:border-holo/40 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatBlock
              icon={MapPin}
              label="System"
              value={row.system}
              accent="bg-blue-500/10 border-blue-500/30 text-blue-300"
            />
            <StatBlock
              icon={Users}
              label="Faction"
              value={row.faction}
              accent="bg-violet-500/10 border-violet-500/30 text-violet-300"
            />
            <StatBlock
              icon={Crosshair}
              label="Mission type"
              value={row.missionType}
              accent="bg-orange-500/10 border-orange-500/30 text-orange-300"
            />
            <StatBlock
              icon={Coins}
              label="Reward"
              value={
                <span className="text-amber-200/90 font-semibold">
                  {rewardNum ?? "—"}
                  {hasBuyIn ? <span className="text-alert text-xs ml-1.5">-{Number(row.raw.buyIn).toLocaleString()} buy-in</span> : null}
                </span>
              }
              accent="bg-amber-500/10 border-amber-500/30 text-amber-300"
            />
            <StatBlock
              icon={Star}
              label="Base XP (reputation)"
              value={row.baseXp}
              accent="bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
            />
            <StatBlock
              icon={Scale}
              label="Legal"
              value={
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {row.legal === "✗" ? (
                    <Badge className="bg-alert/10 text-alert border-alert/30">ILLEGAL</Badge>
                  ) : (
                    <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">LEGAL</Badge>
                  )}
                  {row.tags.includes("SOLO") ? <Badge className="bg-space-800/40 text-space-400 border-space-600/40">SOLO</Badge> : null}
                  {row.tags.includes("UNQ") ? <Badge className="bg-violet-500/10 text-violet-300 border-violet-500/30">UNIQUE</Badge> : null}
                  {row.hasBlueprints ? <Badge className="bg-holo/10 text-holo border-holo/30">BP</Badge> : null}
                </div>
              }
            />
          </div>

          {/* IN/OUT */}
          {row.inOut !== "—" ? (
            <div className="chamfer-sm border border-glass-border bg-space-black/30 p-3">
              <p className="text-[10px] text-space-500 uppercase tracking-wider mobiglas-label mb-1.5">Hauling / IN·OUT</p>
              <p className="text-sm text-space-300 font-mono">{row.inOut}</p>
            </div>
          ) : null}

          {/* Description */}
          {desc ? (
            <div>
              <h3 className="text-[10px] text-space-500 uppercase tracking-wider mobiglas-label mb-2 flex items-center gap-1.5">
                <ScrollText className="w-3.5 h-3.5" /> Description
              </h3>
              <div className="chamfer-sm border border-glass-border bg-space-black/20 p-4">
                <p className="text-space-300 whitespace-pre-wrap text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ) : null}

          {/* Blueprint rewards */}
          {resolvedBlueprints.length > 0 ? (
            <div>
              <h3 className="text-[10px] text-space-500 uppercase tracking-wider mobiglas-label mb-2 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" /> Blueprint rewards
              </h3>
              <p className="text-[11px] text-space-600 leading-relaxed mb-3">{BLUEPRINT_INGAME_CRAFT_SUMMARY}</p>
              <div className="space-y-2">
                {resolvedBlueprints.map((pool, i) => (
                  <details
                    key={`bp-pool-${i}`}
                    className="chamfer-sm border border-holo/20 bg-holo/[0.03] group"
                    open={resolvedBlueprints.length <= 2}
                  >
                    <summary className="flex items-center justify-between gap-2 p-3 cursor-pointer hover:bg-holo/5 transition-colors">
                      <div className="min-w-0 text-left">
                        <span className="text-sm font-medium text-space-200 block truncate">{pool.poolLabel}</span>
                        {pool.poolLabelRaw ? (
                          <span className="text-[10px] text-space-600 font-mono truncate block mt-0.5" title={pool.poolLabelRaw}>
                            {pool.poolLabelRaw}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className="bg-holo/10 text-holo/80 border-holo/20">
                          {pool.chance <= 1 ? `${Math.round(pool.chance * 100)}%` : `${pool.chance}`}
                        </Badge>
                        <span className="text-[10px] text-space-500">
                          {pool.itemNames.length} item{pool.itemNames.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </summary>
                    {pool.itemNames.length > 0 ? (
                      <div className="px-3 pb-3 border-t border-holo/10">
                        <div className="flex flex-wrap gap-1.5 pt-2.5">
                          {pool.itemNames.map((name, ni) => (
                            <span
                              key={`${pool.poolLabel}-${i}-${ni}`}
                              className="text-[11px] px-2 py-1 chamfer-sm border border-glass-border bg-space-900/60 text-space-300"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="px-3 pb-3 text-xs text-space-600">
                        Item list not available in this dataset.
                      </p>
                    )}
                  </details>
                ))}
              </div>
            </div>
          ) : null}

          {/* Raw JSON */}
          <details className="group">
            <summary className="cursor-pointer text-space-500 text-xs mobiglas-label hover:text-holo transition-colors flex items-center gap-1.5">
              <span className="group-open:rotate-90 transition-transform">▸</span> Raw contract data
            </summary>
            <pre className="mt-2 p-3 text-[11px] font-mono bg-space-black/40 border border-glass-border chamfer-sm max-h-56 overflow-auto text-space-500 leading-relaxed">
              {rawJson}
            </pre>
          </details>

          {/* Footer */}
          {payload ? (
            <div className="text-[10px] text-space-600 border-t border-glass-border pt-3 flex flex-wrap gap-x-3 gap-y-1">
              <span>
                Dataset: <span className="text-space-500 font-mono">{gameVersionLabel(payload)}</span>
              </span>
              {payload._meta?.blueprintAugmentedFrom ? (
                <span>
                  BP from: <span className="text-space-500 font-mono">{payload._meta.blueprintAugmentedFrom}</span>
                </span>
              ) : null}
              <span>
                ID: <span className="text-space-500 font-mono">{row.id}</span>
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
