import { shipsData, type ShipFromJson } from "./ships-data.generated";

export type ShipRecord = ShipFromJson;

export function getAllShips(): readonly ShipRecord[] {
  return shipsData;
}

export function getShipBySlug(slug: string): ShipRecord | undefined {
  return shipsData.find((s) => s.slug === slug);
}

/** Query string for /armory — matches ArmoryClient URL params */
export function armoryQueryForHardpoint(hp: ShipFromJson["hardpoints"][number]): string | null {
  if (!hp.category || !hp.subcategory) return null;
  const p = new URLSearchParams();
  p.set("category", hp.category);
  p.set("subcategory", hp.subcategory);
  if (hp.size > 0) p.set("size", String(hp.size));
  return p.toString();
}

export function armoryPathForHardpoint(hp: ShipFromJson["hardpoints"][number]): string | null {
  const q = armoryQueryForHardpoint(hp);
  if (!q) return null;
  return `/armory?${q}`;
}

export function uniqueManufacturers(ships: readonly ShipRecord[]): string[] {
  const set = new Set<string>();
  for (const s of ships) {
    if (s.manufacturer) set.add(s.manufacturer);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
