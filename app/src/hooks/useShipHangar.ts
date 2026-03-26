"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppUser } from "@/context/AuthContext";
import {
  parseShipOwnership,
  serializeShipOwnership,
  SHIP_OWNERSHIP_STORAGE_KEY,
  type ShipAcquisition,
  type ShipOwnershipMap,
} from "@/lib/ship-ownership";

export type OwnershipFilter = "all" | "owned" | "pledge" | "ingame" | "unowned";

export type FleetAcquisitionFilter = "all" | "pledge" | "ingame";

async function putServerShip(slug: string, acquisition: ShipAcquisition | null): Promise<boolean> {
  const res = await fetch("/api/ships/mine", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shipSlug: slug, acquisition }),
  });
  return res.ok;
}

async function fetchMineMap(): Promise<ShipOwnershipMap> {
  const res = await fetch("/api/ships/mine");
  if (!res.ok) return {};
  const data = (await res.json()) as {
    entries?: { shipSlug: string; acquisition: ShipAcquisition }[];
  };
  const m: ShipOwnershipMap = {};
  for (const e of data.entries ?? []) {
    if (e.shipSlug && (e.acquisition === "pledge" || e.acquisition === "ingame")) {
      m[e.shipSlug] = e.acquisition;
    }
  }
  return m;
}

/**
 * Guest: localStorage only. Signed-in: SQLite via /api/ships/mine (visible to org on fleet tab).
 */
export function useShipHangar(user: AppUser | null) {
  const [localMap, setLocalMap] = useState<ShipOwnershipMap | null>(null);
  const [serverMap, setServerMap] = useState<ShipOwnershipMap>({});
  const [serverLoaded, setServerLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setLocalMap(parseShipOwnership(localStorage.getItem(SHIP_OWNERSHIP_STORAGE_KEY)));
      setServerLoaded(false);
    } else {
      setLocalMap(null);
    }
  }, [user]);

  useEffect(() => {
    if (user || localMap === null) return;
    try {
      localStorage.setItem(SHIP_OWNERSHIP_STORAGE_KEY, serializeShipOwnership(localMap));
    } catch {
      /* quota */
    }
  }, [user, localMap]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setServerLoaded(false);
    (async () => {
      const m = await fetchMineMap();
      if (!cancelled) {
        setServerMap(m);
        setServerLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.username]);

  const map = user ? serverMap : (localMap ?? {});
  const ready = user ? serverLoaded : localMap !== null;

  const setAcquisition = useCallback(
    async (slug: string, acquisition: ShipAcquisition | null) => {
      if (user) {
        setServerMap((prev) => {
          const next = { ...prev };
          if (acquisition === null) delete next[slug];
          else next[slug] = acquisition;
          return next;
        });
        const ok = await putServerShip(slug, acquisition);
        if (!ok) setServerMap(await fetchMineMap());
        return;
      }
      setLocalMap((prev) => {
        const base = prev ?? {};
        const next = { ...base };
        if (acquisition === null) delete next[slug];
        else next[slug] = acquisition;
        return next;
      });
    },
    [user]
  );

  return {
    ready,
    map,
    setAcquisition,
    /** True when hangar is stored on server (signed-in). */
    isServerBacked: !!user,
  };
}
