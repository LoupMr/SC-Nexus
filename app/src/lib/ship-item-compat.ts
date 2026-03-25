import type { DatabaseItem } from "./database";
import { shipArmoryCompatIndex, shipArmoryCompatLabels } from "./ship-armory-compat.generated";

export type ShipItemCompatRef = {
  slug: string;
  name: string;
  manufacturer: string;
};

/** Ship weapons & ship components only — uses FleetYards hardpoint groupings. */
export function getShipsCompatibleWithItem(item: DatabaseItem): ShipItemCompatRef[] {
  const cat = item.category;
  if (cat !== "Vehicle_Weaponry" && cat !== "Vehicle_Components") return [];

  const sub = item.subcategory;
  const itemSize = typeof item.Size === "number" && !Number.isNaN(item.Size) ? item.Size : null;
  const slugs = new Set<string>();

  const addKey = (key: string) => {
    const arr = shipArmoryCompatIndex[key];
    if (!arr) return;
    for (const s of arr) slugs.add(s);
  };

  if (itemSize !== null) {
    addKey(`${cat}|${sub}|${itemSize}`);
    addKey(`${cat}|${sub}|0`);
  } else {
    const prefix = `${cat}|${sub}|`;
    for (const key of Object.keys(shipArmoryCompatIndex)) {
      if (key.startsWith(prefix)) addKey(key);
    }
  }

  const out: ShipItemCompatRef[] = [];
  for (const slug of slugs) {
    const L = shipArmoryCompatLabels[slug];
    if (L) out.push({ slug, name: L.name, manufacturer: L.manufacturer });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}
