"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import type { ShipRecord } from "@/lib/ships";
import { armoryPathForHardpoint } from "@/lib/ships";

interface ShipCardProps {
  ship: ShipRecord;
  onOpen?: () => void;
}

export default function ShipCard({ ship, onOpen }: ShipCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={clsx(
        "glass-card chamfer-md overflow-hidden flex flex-col w-full text-left",
        "hover:border-holo/30 hover:shadow-[0_0_12px_rgba(92,225,230,0.15)] transition-all border border-glass-border"
      )}
    >
      <div className="relative h-36 sm:h-40 bg-space-900/60 border-b border-glass-border">
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
  );
}
