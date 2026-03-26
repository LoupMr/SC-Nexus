"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { X, ExternalLink } from "lucide-react";
import Portal from "@/components/Portal";
import type { ShipRecord } from "@/lib/ships";
import { armoryPathForHardpoint } from "@/lib/ships";
import type { ShipAcquisition } from "@/lib/ship-ownership";

export default function ShipDetailModal({
  ship,
  onClose,
  acquisition,
  onAcquisitionChange,
}: {
  ship: ShipRecord;
  onClose: () => void;
  acquisition: ShipAcquisition | "";
  onAcquisitionChange: (slug: string, value: ShipAcquisition | null) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <Portal>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ship-detail-title"
          tabIndex={-1}
          className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto glass-card chamfer-lg border border-glass-border shadow-[0_0_24px_rgba(92,225,230,0.12)] focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2 p-4 border-b border-glass-border">
            <h2 id="ship-detail-title" className="text-lg font-semibold text-space-100 mobiglas-heading">
              {ship.name}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 chamfer-sm border border-glass-border text-space-400 hover:text-holo transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div className="relative h-48 bg-space-900/50 rounded chamfer-md border border-glass-border">
              {ship.storeImage ? (
                <Image
                  src={ship.storeImage}
                  alt=""
                  fill
                  className="object-contain p-3"
                  sizes="(max-width: 640px) 100vw, 512px"
                  unoptimized
                />
              ) : null}
            </div>
            <div className="chamfer-md border border-glass-border bg-space-900/40 p-3 space-y-2">
              <h3 className="text-[10px] font-semibold text-space-500 uppercase tracking-wider mobiglas-label">
                My hangar
              </h3>
              <p className="text-[11px] text-space-600 leading-relaxed">
                Mark whether you own this hull from a pledge or an in-game purchase. Stored only on this device.
              </p>
              <label htmlFor="ship-detail-hangar" className="sr-only">
                Hangar status
              </label>
              <select
                id="ship-detail-hangar"
                value={acquisition}
                onChange={(e) => {
                  const v = e.target.value;
                  onAcquisitionChange(ship.slug, v === "" ? null : (v as ShipAcquisition));
                }}
                className="w-full chamfer-sm bg-space-900/80 border border-glass-border text-sm text-space-200 py-2.5 px-3 mobiglas-label focus:outline-none focus:border-holo/40 focus:ring-1 focus:ring-holo/20"
              >
                <option value="">Not in my hangar</option>
                <option value="pledge">I own — pledged / gift / CCU</option>
                <option value="ingame">I own — bought in-game (aUEC)</option>
              </select>
            </div>

            <div className="text-sm text-space-400 space-y-1">
              <p>
                <span className="text-space-600">Manufacturer:</span> {ship.manufacturer || "—"}
              </p>
              <p>
                <span className="text-space-600">Class:</span> {ship.classification || "—"}
              </p>
              <p>
                <span className="text-space-600">Focus:</span> {ship.focus || "—"}
              </p>
              <p>
                <span className="text-space-600">Crew:</span>{" "}
                {ship.crewMin != null && ship.crewMax != null
                  ? `${ship.crewMin}–${ship.crewMax}`
                  : "—"}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pt-2">
                {ship.mass != null && (
                  <span>
                    Mass: <span className="text-space-300 font-mono">{ship.mass.toLocaleString()} kg</span>
                  </span>
                )}
                {ship.length != null && (
                  <span>
                    L×W×H:{" "}
                    <span className="text-space-300 font-mono">
                      {ship.length}×{ship.beam ?? "—"}×{ship.height ?? "—"} m
                    </span>
                  </span>
                )}
                {ship.scmSpeed != null && (
                  <span>
                    SCM: <span className="text-space-300 font-mono">{ship.scmSpeed} m/s</span>
                  </span>
                )}
                {ship.cargo != null && (
                  <span>
                    Cargo: <span className="text-space-300 font-mono">{ship.cargo} SCU</span>
                  </span>
                )}
              </div>
            </div>
            {ship.description ? (
              <p className="text-xs text-space-500 leading-relaxed">{ship.description}</p>
            ) : null}

            <div>
              <h3 className="text-xs font-semibold text-space-300 mobiglas-label mb-2">Hardpoints &amp; Armory</h3>
              <div className="flex flex-wrap gap-1.5">
                {ship.hardpoints.map((hp, i) => {
                  const armory = armoryPathForHardpoint(hp);
                  const text =
                    hp.size > 0 ? `${hp.label} — ${hp.count}× Size ${hp.size}` : `${hp.label} — ${hp.count}×`;
                  if (armory) {
                    return (
                      <Link
                        key={`${hp.fleetyardsType}-${i}`}
                        href={armory}
                        className="text-[11px] px-2.5 py-1 chamfer-sm border border-holo/35 bg-holo/10 text-holo hover:bg-holo/20 transition-colors"
                      >
                        {text}
                      </Link>
                    );
                  }
                  return (
                    <span
                      key={`${hp.fleetyardsType}-${i}`}
                      className="text-[11px] px-2.5 py-1 chamfer-sm border border-space-700/40 text-space-500"
                    >
                      {text}
                    </span>
                  );
                })}
              </div>
            </div>

            {ship.fleetyardsUrl ? (
              <div className="pt-2">
                <a
                  href={ship.fleetyardsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 chamfer-md border border-glass-border text-space-300 text-sm hover:border-holo/25 transition-colors"
                >
                  Open on FleetYards
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Portal>
  );
}
