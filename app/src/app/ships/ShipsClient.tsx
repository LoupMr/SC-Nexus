"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Rocket } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import ShipCard from "@/components/ShipCard";
import ShipDetailModal from "@/components/ShipDetailModal";
import { getAllShips, uniqueManufacturers, type ShipRecord } from "@/lib/ships";
import { inputClass } from "@/lib/styles";

export default function ShipsClient() {
  const allShips = useMemo(() => [...getAllShips()], []);
  const manufacturers = useMemo(() => uniqueManufacturers(allShips), [allShips]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [manufacturer, setManufacturer] = useState("all");
  const [classification, setClassification] = useState("all");
  const [selected, setSelected] = useState<ShipRecord | null>(null);

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

  const classifications = useMemo(() => {
    const s = new Set<string>();
    for (const sh of allShips) {
      if (sh.classification) s.add(sh.classification);
    }
    return [...s].sort();
  }, [allShips]);

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
      return matchM && matchC && matchQ;
    });
  }, [allShips, search, manufacturer, classification]);

  return (
    <>
      <PageHeader
        icon={Rocket}
        title="SHIP MATRIX"
        subtitle="Searchable fleet data — hardpoints link to the Armory with size filters"
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6 flex-wrap">
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
      </div>

      <p className="text-space-600 text-xs mobiglas-label mb-4">
        Showing {filtered.length} of {allShips.length} ships · Data from{" "}
        <a href="https://fleetyards.net" className="text-holo hover:underline" target="_blank" rel="noreferrer">
          FleetYards
        </a>{" "}
        (refresh with <code className="text-space-500">REFRESH_SHIPS=1</code> in generate script)
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((ship) => (
          <ShipCard key={ship.slug} ship={ship} onOpen={() => setSelected(ship)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-space-500 text-sm">No ships match your filters.</div>
      )}

      {selected && <ShipDetailModal ship={selected} onClose={closeShipModal} />}
    </>
  );
}
