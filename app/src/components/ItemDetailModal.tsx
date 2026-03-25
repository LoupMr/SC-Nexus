"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useEffect, useRef } from "react";
import { X, BookOpen, Package, Rocket } from "lucide-react";
import Portal from "@/components/Portal";
import { getItemStats, getSubcategoryLabel, getCategoryLabel, DatabaseItem } from "@/lib/database";
import { getShipsCompatibleWithItem } from "@/lib/ship-item-compat";

interface LedgerEntry {
  id: string;
  itemName: string;
  subcategory: string;
  owner: string;
  quantity: number;
  location: string;
  status: string;
  sharedWithOrg: boolean;
}

function formatValue(value: unknown): string {
  if (typeof value === "number") {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString();
  }
  return String(value ?? "—");
}

interface ItemDetailModalProps {
  item: DatabaseItem;
  onClose: () => void;
  ledgerEntries?: LedgerEntry[];
  isLoggedIn?: boolean;
}

export default function ItemDetailModal({ item, onClose, ledgerEntries = [], isLoggedIn = false }: ItemDetailModalProps) {
  const stats = getItemStats(item);
  const compatibleShips = useMemo(() => getShipsCompatibleWithItem(item), [item]);
  const showShipCompat =
    item.category === "Vehicle_Weaponry" || item.category === "Vehicle_Components";
  const totalInLedger = ledgerEntries.reduce((sum, e) => sum + e.quantity, 0);
  const inLedger = ledgerEntries.length > 0;
  const thumb = typeof item.ThumbUrl === "string" ? item.ThumbUrl : null;
  const desc = typeof item.Description === "string" ? item.Description : null;
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
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="item-detail-title"
          tabIndex={-1}
          className="glass-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-holo/20 shadow-xl focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 id="item-detail-title" className="text-xl font-semibold text-space-200 flex items-center gap-2">
              <Package className="w-5 h-5 text-holo" /> Item details
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-space-500 hover:text-space-200 hover:bg-space-800/50 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="rounded-xl p-4 mb-4 bg-space-900/40 border border-glass-border">
            <h3 className="text-base font-semibold text-space-200">{item.Name}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="inline-block text-xs px-2.5 py-1 rounded-lg bg-holo/10 border border-holo/30 text-holo">
                {getSubcategoryLabel(item.subcategory)}
              </span>
              <span className="inline-block text-xs px-2.5 py-1 rounded-lg bg-space-800/60 border border-glass-border text-space-400">
                {getCategoryLabel(item.category)}
              </span>
            </div>
            {thumb ? (
              <div className="relative w-full h-40 mt-3 rounded-lg border border-glass-border bg-space-900/50 overflow-hidden">
                <Image
                  src={thumb}
                  alt=""
                  fill
                  className="object-contain p-2"
                  sizes="280px"
                  unoptimized={thumb.startsWith("data:")}
                />
              </div>
            ) : null}
            {desc ? <p className="text-xs text-space-500 mt-3 leading-relaxed">{desc}</p> : null}
          </div>

          {/* Ledger status */}
          <div className="rounded-xl p-4 mb-4 border border-glass-border bg-space-900/40">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-industrial" />
              <span className="text-sm font-medium text-space-300">Org Ledger</span>
            </div>
            {!isLoggedIn ? (
              <p className="text-sm text-space-500">Log in to see if this item is in the org&apos;s ledger.</p>
            ) : inLedger ? (
              <div>
                <p className="text-sm text-success font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  In org ledger — {totalInLedger} total
                </p>
                <div className="mt-2 space-y-1.5">
                  {ledgerEntries.map((e) => (
                    <div key={e.id} className="text-xs text-space-400 flex justify-between gap-2">
                      <span>{e.quantity}x at {e.location}</span>
                      <span className="text-space-500">— {e.owner}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-space-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-space-600" />
                Not in org ledger
              </p>
            )}
          </div>

          {showShipCompat ? (
            <div className="rounded-xl p-4 mb-4 border border-glass-border bg-space-900/40">
              <div className="flex items-center gap-2 mb-2">
                <Rocket className="w-4 h-4 text-holo shrink-0" />
                <span className="text-sm font-medium text-space-300">Ship matrix compatibility</span>
              </div>
              {compatibleShips.length === 0 ? (
                <p className="text-xs text-space-500 leading-relaxed">
                  No ships list a matching hardpoint (same component type and size) in FleetYards data.
                </p>
              ) : (
                <>
                  <p className="text-xs text-space-600 mb-2">
                    Ships with at least one slot that fits this item:
                  </p>
                  <ul className="max-h-44 overflow-y-auto space-y-1.5 pr-1 text-sm">
                    {compatibleShips.map((s) => (
                      <li key={s.slug} className="text-space-300">
                        <Link
                          href={`/ships?ship=${encodeURIComponent(s.slug)}`}
                          className="text-holo hover:underline font-medium"
                        >
                          {s.name}
                        </Link>
                        {s.manufacturer ? (
                          <span className="text-xs text-space-500 ml-1.5">· {s.manufacturer}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : null}

          {/* Full stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stats.map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl bg-space-900/40 border border-glass-border px-4 py-3"
              >
                <div className="text-xs text-space-500 uppercase tracking-wider">{label}</div>
                <div className="text-sm font-medium text-space-200 font-mono mt-1">
                  {formatValue(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Portal>
  );
}
