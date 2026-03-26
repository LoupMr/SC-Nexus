"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Rocket, LayoutGrid, Users } from "lucide-react";
import clsx from "clsx";
import PageHeader from "@/components/PageHeader";
import ShipCard from "@/components/ShipCard";
import ShipDetailModal from "@/components/ShipDetailModal";
import OrgFleetPanel, { type OrgFleetEntry } from "@/components/OrgFleetPanel";
import { getAllShips, uniqueManufacturers, type ShipRecord } from "@/lib/ships";
import { inputClass } from "@/lib/styles";
import { useShipHangar, type OwnershipFilter, type FleetAcquisitionFilter } from "@/hooks/useShipHangar";
import { useAuth } from "@/context/useAuth";

type ShipsTab = "matrix" | "fleet";

export default function ShipsClient() {
  const { user, loading: authLoading } = useAuth();
  const allShips = useMemo(() => [...getAllShips()], []);
  const manufacturers = useMemo(() => uniqueManufacturers(allShips), [allShips]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<ShipsTab>("matrix");
  const [search, setSearch] = useState("");
  const [manufacturer, setManufacturer] = useState("all");
  const [classification, setClassification] = useState("all");
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>("all");
  const [fleetAcqFilter, setFleetAcqFilter] = useState<FleetAcquisitionFilter>("all");
  const [selected, setSelected] = useState<ShipRecord | null>(null);

  const [fleetEntries, setFleetEntries] = useState<OrgFleetEntry[]>([]);
  const [fleetLoading, setFleetLoading] = useState(false);
  const [fleetError, setFleetError] = useState<string | null>(null);

  const { ready, map: ownershipMap, setAcquisition, isServerBacked } = useShipHangar(user);

  useEffect(() => {
    const slug = searchParams.get("ship");
    if (!slug) return;
    const ship = allShips.find((s) => s.slug === slug);
    if (ship) setSelected(ship);
  }, [searchParams, allShips]);

  const closeShipModal = useCallback(() => {
    setSelected(null);
    if (searchParams.get("ship")) {
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  useEffect(() => {
    if (tab !== "fleet" || !user) {
      setFleetLoading(false);
      return;
    }
    let cancelled = false;
    setFleetLoading(true);
    setFleetError(null);
    (async () => {
      try {
        const res = await fetch("/api/ships/fleet");
        if (!res.ok) throw new Error("Could not load org fleet");
        const data = (await res.json()) as { entries?: OrgFleetEntry[] };
        if (!cancelled) setFleetEntries(Array.isArray(data.entries) ? data.entries : []);
      } catch {
        if (!cancelled) {
          setFleetError("Could not load org fleet.");
          setFleetEntries([]);
        }
      } finally {
        if (!cancelled) setFleetLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, user?.username]);

  const classifications = useMemo(() => {
    const s = new Set<string>();
    for (const sh of allShips) {
      if (sh.classification) s.add(sh.classification);
    }
    return [...s].sort();
  }, [allShips]);

  const hangarCounts = useMemo(() => {
    let pledge = 0;
    let ingame = 0;
    for (const s of allShips) {
      const a = ownershipMap[s.slug];
      if (a === "pledge") pledge += 1;
      else if (a === "ingame") ingame += 1;
    }
    return { pledge, ingame, total: pledge + ingame };
  }, [allShips, ownershipMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allShips.filter((s) => {
      const matchM = manufacturer === "all" || s.manufacturer === manufacturer;
      const matchC = classification === "all" || s.classification === classification;
      const matchQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.manufacturer.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q);
      if (!matchM || !matchC || !matchQ) return false;

      const acq = ownershipMap[s.slug];
      if (ownershipFilter === "owned" && !acq) return false;
      if (ownershipFilter === "pledge" && acq !== "pledge") return false;
      if (ownershipFilter === "ingame" && acq !== "ingame") return false;
      if (ownershipFilter === "unowned" && acq) return false;
      return true;
    });
  }, [allShips, search, manufacturer, classification, ownershipFilter, ownershipMap]);

  const matrixSubtitle = useMemo(() => {
    const sync = isServerBacked
      ? "Hangar is saved to your account — other members can see it on Org fleet."
      : "Hangar is saved on this device only. Sign in to share with the org.";
    const base = `Searchable fleet data — ${sync} Hardpoints link to the Armory.`;
    if (!ready || hangarCounts.total === 0) return base;
    return `${base} You have marked ${hangarCounts.total} hull${hangarCounts.total !== 1 ? "s" : ""} (${hangarCounts.pledge} pledged, ${hangarCounts.ingame} in-game).`;
  }, [ready, hangarCounts, isServerBacked]);

  return (
    <>
      <PageHeader
        icon={Rocket}
        title="SHIP MATRIX"
        subtitle={tab === "matrix" ? matrixSubtitle : "Organization-wide hulls members have marked — filter by pledge or in-game."}
      />

      <div className="flex gap-2 mb-5 border-b border-glass-border pb-3">
        <button
          type="button"
          onClick={() => setTab("matrix")}
          className={clsx(
            "inline-flex items-center gap-2 px-4 py-2 chamfer-sm border text-sm mobiglas-label transition-all",
            tab === "matrix"
              ? "bg-holo/15 border-holo/40 text-holo"
              : "bg-space-900/40 border-glass-border text-space-400 hover:border-holo/25 hover:text-space-300"
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          My matrix
        </button>
        <button
          type="button"
          onClick={() => setTab("fleet")}
          className={clsx(
            "inline-flex items-center gap-2 px-4 py-2 chamfer-sm border text-sm mobiglas-label transition-all",
            tab === "fleet"
              ? "bg-holo/15 border-holo/40 text-holo"
              : "bg-space-900/40 border-glass-border text-space-400 hover:border-holo/25 hover:text-space-300"
          )}
        >
          <Users className="w-4 h-4" />
          Org fleet
        </button>
      </div>

      {tab === "fleet" && authLoading ? (
        <div className="flex justify-center py-16 text-space-500 text-sm mobiglas-label">Loading…</div>
      ) : null}

      {tab === "fleet" && !user && !authLoading ? (
        <div className="chamfer-md border border-glass-border bg-space-900/40 px-4 py-8 text-center text-space-400 text-sm">
          <p className="mb-3">Sign in to view the organization&apos;s combined hangar.</p>
          <Link href="/login" className="text-holo hover:underline mobiglas-label">
            Enter portal
          </Link>
        </div>
      ) : null}

      {tab === "fleet" && user ? (
        <>
          {fleetError ? (
            <div className="mb-4 text-sm text-alert border border-alert/30 chamfer-md px-3 py-2 bg-alert/5">{fleetError}</div>
          ) : null}
          <OrgFleetPanel
            entries={fleetEntries}
            acquisitionFilter={fleetAcqFilter}
            onAcquisitionFilterChange={setFleetAcqFilter}
            loading={fleetLoading}
          />
        </>
      ) : null}

      {tab === "matrix" ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
            <input
              type="search"
              placeholder="Search ships…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass + " flex-1 min-w-[200px]"}
              aria-label="Search ships"
            />
            <select
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              className={inputClass + " sm:w-56"}
              aria-label="Manufacturer"
            >
              <option value="all">All manufacturers</option>
              {manufacturers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className={inputClass + " sm:w-48"}
              aria-label="Classification"
            >
              <option value="all">All classes</option>
              {classifications.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={ownershipFilter}
              onChange={(e) => setOwnershipFilter(e.target.value as OwnershipFilter)}
              className={inputClass + " sm:w-52"}
              aria-label="Hangar filter"
            >
              <option value="all">All ships</option>
              <option value="owned">My hangar (any)</option>
              <option value="pledge">Pledged only</option>
              <option value="ingame">In-game only</option>
              <option value="unowned">Not in my hangar</option>
            </select>
          </div>

          <p className="text-space-600 text-xs mobiglas-label mb-4">
            Showing {filtered.length} of {allShips.length} ships · Data from{" "}
            <a href="https://fleetyards.net" className="text-holo hover:underline" target="_blank" rel="noreferrer">
              FleetYards
            </a>{" "}
          </p>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((ship) => (
              <ShipCard
                key={ship.slug}
                ship={ship}
                onOpen={() => setSelected(ship)}
                acquisition={ownershipMap[ship.slug] ?? ""}
                onAcquisitionChange={setAcquisition}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-space-500 text-sm">No ships match your filters.</div>
          )}
        </>
      ) : null}

      {selected ? (
        <ShipDetailModal
          ship={selected}
          onClose={closeShipModal}
          acquisition={ownershipMap[selected.slug] ?? ""}
          onAcquisitionChange={setAcquisition}
        />
      ) : null}
    </>
  );
}
