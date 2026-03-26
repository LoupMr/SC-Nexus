"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import type { ShipRecord } from "@/lib/ships";
import { armoryPathForHardpoint } from "@/lib/ships";
import type { ShipAcquisition } from "@/lib/ship-ownership";

interface ShipCardProps {
  ship: ShipRecord;
  onOpen?: () => void;
  /** Current hangar mark for this ship (empty string = not marked) */
  acquisition: ShipAcquisition | "";
  onAcquisitionChange: (slug: string, value: ShipAcquisition | null) => void;
}

export default function ShipCard({ ship, onOpen, acquisition, onAcquisitionChange }: ShipCardProps) {
  return (
    <article
      className={clsx(
        "glass-card chamfer-md overflow-hidden flex flex-col w-full border border-glass-border",
        acquisition === "pledge" && "ring-1 ring-amber-500/25 border-amber-500/20",
        acquisition === "ingame" && "ring-1 ring-holo/20 border-holo/25"
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className={clsx(
          "flex flex-col flex-1 min-h-0 text-left w-full",
          "hover:border-holo/30 hover:shadow-[0_0_12px_rgba(92,225,230,0.15)] transition-all"
        )}
      >
        <div className="relative h-36 sm:h-40 bg-space-900/60 border-b border-glass-border">
          {acquisition ? (
            <span
              className={clsx(
                "absolute top-2 right-2 z-10 text-[9px] px-2 py-0.5 chamfer-sm border font-semibold mobiglas-label",
                acquisition === "pledge"
                  ? "bg-amber-500/20 text-amber-200 border-amber-500/35"
                  : "bg-holo/15 text-holo border-holo/35"
              )}
            >
              {acquisition === "pledge" ? "PLEDGED" : "IN-GAME"}
            </span>
          ) : null}
          {ship.storeImage ? (
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
        <div className="p-3 sm:p-4 flex-1 flex flex-col gap-2 min-w-0">
          <div>
            <h3 className="text-sm font-semibold text-space-200 mobiglas-label truncate">{ship.name}</h3>
            <p className="text-[11px] text-space-500 truncate">{ship.manufacturer}</p>
            <p className="text-[10px] text-holo/80 mobiglas-label mt-0.5">{ship.classification}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {ship.hardpoints.slice(0, 8).map((hp, i) => {
              const armory = armoryPathForHardpoint(hp);
              const label =
                hp.size > 0 ? `${hp.label}: ${hp.count}× S${hp.size}` : `${hp.label}: ${hp.count}×`;
              if (armory) {
                return (
                  <Link
                    key={`${hp.fleetyardsType}-${hp.size}-${i}`}
                    href={armory}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] px-2 py-0.5 chamfer-sm border border-holo/25 bg-holo/5 text-holo hover:bg-holo/15 transition-colors mobiglas-label"
                  >
                    {label}
                  </Link>
                );
              }
              return (
                <span
                  key={`${hp.fleetyardsType}-${hp.size}-${i}`}
                  className="text-[10px] px-2 py-0.5 chamfer-sm border border-space-700/50 text-space-500 mobiglas-label"
                >
                  {label}
                </span>
              );
            })}
            {ship.hardpoints.length > 8 && (
              <span className="text-[10px] text-space-600 mobiglas-label">+{ship.hardpoints.length - 8} more</span>
            )}
          </div>
        </div>
      </button>
      <div className="px-3 py-2 border-t border-glass-border bg-space-900/50">
        <label htmlFor={`hangar-${ship.slug}`} className="sr-only">
          Hangar status for {ship.name}
        </label>
        <select
          id={`hangar-${ship.slug}`}
          value={acquisition}
          onChange={(e) => {
            const v = e.target.value;
            onAcquisitionChange(ship.slug, v === "" ? null : (v as ShipAcquisition));
          }}
          className="w-full chamfer-sm bg-space-900/80 border border-glass-border text-[11px] text-space-200 py-2 px-2 mobiglas-label focus:outline-none focus:border-holo/40 focus:ring-1 focus:ring-holo/20"
        >
          <option value="">Not in my hangar</option>
          <option value="pledge">I own — pledged / gift / CCU</option>
          <option value="ingame">I own — bought in-game (aUEC)</option>
        </select>
      </div>
    </article>
  );
}
