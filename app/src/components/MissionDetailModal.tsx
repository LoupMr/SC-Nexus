"use client";

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import {
  flattenDescription,
  gameVersionLabel,
  resolveContractBlueprints,
  type MissionTableRow,
  type ScmdbMissionPayload,
} from "@/lib/missions";

type Props = {
  row: MissionTableRow | null;
  payload: ScmdbMissionPayload | null;
  onClose: () => void;
};

export default function MissionDetailModal({ row, payload, onClose }: Props) {
  useEffect(() => {
    if (!row) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [row, onClose]);

  const rawJson = useMemo(() => {
    if (!row) return "";
    try {
      return JSON.stringify(row.raw, null, 2);
    } catch {
      return "";
    }
  }, [row]);

  const resolvedBlueprints = useMemo(() => {
    if (!row || !payload) return [];
    return resolveContractBlueprints(row.raw, payload.blueprintPools);
  }, [row, payload]);

  if (!row) return null;

  const desc = flattenDescription(row.raw.description);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-space-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mission-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={clsx(
          "relative z-10 w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[85vh] flex flex-col",
          "chamfer-sm border border-glass-border bg-space-900/95 shadow-[0_0_24px_rgba(92,225,230,0.12)]",
          "rounded-t-lg sm:rounded-lg"
        )}
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b border-glass-border">
          <div className="min-w-0">
            <p className="text-[10px] mobiglas-label text-space-500 uppercase tracking-wider">
              {row.kind === "legacy" ? "Legacy contract" : "Contract"} · {row.id}
            </p>
            <h2 id="mission-detail-title" className="text-lg font-semibold text-space-100 mt-1">
              {row.title}
            </h2>
            {row.raw.debugName ? (
              <p className="text-xs text-space-500 font-mono mt-1 truncate" title={row.raw.debugName}>
                {row.raw.debugName}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded chamfer-sm border border-glass-border text-space-400 hover:text-holo hover:border-holo/40 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4 text-sm">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-space-300">
            <div>
              <dt className="text-space-500 text-xs mobiglas-label">System</dt>
              <dd>{row.system}</dd>
            </div>
            <div>
              <dt className="text-space-500 text-xs mobiglas-label">Faction</dt>
              <dd>{row.faction}</dd>
            </div>
            <div>
              <dt className="text-space-500 text-xs mobiglas-label">Mission type</dt>
              <dd>{row.missionType}</dd>
            </div>
            <div>
              <dt className="text-space-500 text-xs mobiglas-label">Reward</dt>
              <dd className="text-amber-200/90">{row.reward}</dd>
            </div>
            <div>
              <dt className="text-space-500 text-xs mobiglas-label">Base XP (rep)</dt>
              <dd>{row.baseXp}</dd>
            </div>
            <div>
              <dt className="text-space-500 text-xs mobiglas-label">Tags / IN·OUT</dt>
              <dd>
                <span className="text-space-400">{row.tags}</span>
                {" · "}
                <span className="text-space-400">{row.inOut}</span>
              </dd>
            </div>
            <div>
              <dt className="text-space-500 text-xs mobiglas-label">Legal</dt>
              <dd>{row.legal}</dd>
            </div>
          </dl>

          {desc ? (
            <div>
              <h3 className="text-xs mobiglas-label text-space-500 uppercase tracking-wider mb-2">
                Description
              </h3>
              <p className="text-space-300 whitespace-pre-wrap text-sm leading-relaxed">{desc}</p>
            </div>
          ) : null}

          {resolvedBlueprints.length > 0 ? (
            <div>
              <h3 className="text-xs mobiglas-label text-space-500 uppercase tracking-wider mb-2">
                Blueprint rewards
              </h3>
              <ul className="space-y-3 text-space-300">
                {resolvedBlueprints.map((pool, i) => (
                  <li
                    key={`${pool.poolLabel}-${i}`}
                    className="chamfer-sm border border-glass-border bg-space-black/30 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-space-200">{pool.poolLabel}</span>
                      <span className="text-xs text-space-500">
                        Weight / chance {pool.chance <= 1 ? `${Math.round(pool.chance * 100)}%` : pool.chance}
                      </span>
                    </div>
                    {pool.itemNames.length > 0 ? (
                      <ul className="mt-2 text-xs text-space-400 list-disc list-inside space-y-0.5 max-h-40 overflow-y-auto">
                        {pool.itemNames.map((name, ni) => (
                          <li key={`${pool.poolLabel}-${i}-${ni}`}>{name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-space-600">
                        Pool loaded; item list missing for this dataset.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <details className="group">
            <summary className="cursor-pointer text-holo text-sm mobiglas-label hover:underline">
              This contract (JSON)
            </summary>
            <pre className="mt-2 p-3 text-xs font-mono bg-space-black/50 border border-glass-border rounded max-h-64 overflow-auto text-space-400">
              {rawJson}
            </pre>
          </details>

          {payload ? (
            <p className="text-xs text-space-600 border-t border-glass-border pt-4">
              Dataset version:{" "}
              <span className="text-space-400 font-mono">{gameVersionLabel(payload)}</span>
              {payload._meta?.blueprintAugmentedFrom ? (
                <>
                  {" "}
                  · Blueprint pools / rewards augmented from{" "}
                  <span className="text-space-400 font-mono">
                    {payload._meta.blueprintAugmentedFrom}
                  </span>
                </>
              ) : null}
              . Full merge lives in{" "}
              <code className="text-holo/90">/data/mission_data.json</code>.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
