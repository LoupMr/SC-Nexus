/**
 * Personal hangar marks for the ship matrix — stored in localStorage (this browser only).
 */

export const SHIP_OWNERSHIP_STORAGE_KEY = "sc-nexus-ship-ownership";

/** Pledged (RSI / warbond / etc.) vs bought with aUEC in the verse */
export type ShipAcquisition = "pledge" | "ingame";

export type ShipOwnershipMap = Record<string, ShipAcquisition>;

export function parseShipOwnership(raw: string | null): ShipOwnershipMap {
  if (!raw) return {};
  try {
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return {};
    const out: ShipOwnershipMap = {};
    for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
      if (v === "pledge" || v === "ingame") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeShipOwnership(map: ShipOwnershipMap): string {
  return JSON.stringify(map);
}
