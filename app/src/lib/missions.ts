/**
 * Helpers for SCMDb-style merged mission JSON (contracts + legacyContracts + pools).
 * @see https://scmdb.net/
 */

export type ScmdbMeta = {
  version: string;
  mergedFile: string;
  fetchedAt: string;
  source: string;
  /** Present when live fetch merged PTU blueprintPools / blueprintRewards */
  blueprintAugmentedFrom?: string;
  blueprintPoolsMergedFromPtu?: number;
  contractsBlueprintRewardsFromPtu?: number;
};

export type ScmdbLocationEntry = {
  name?: string;
  type?: string;
  system?: string | null;
  planet?: string | null;
  moon?: string | null;
};

export type ScmdbAvailability = {
  onceOnly?: boolean;
  maxPlayersPerInstance?: number | null;
};

export type BlueprintRewardRef = {
  blueprintPool?: string;
  chance?: number;
  poolName?: string;
};

export type ScmdbBlueprintPoolEntry = {
  name?: string;
  blueprints?: Array<{ name?: string; weight?: number }>;
};

export type ScmdbContract = {
  id?: string;
  debugName?: string;
  title?: string;
  description?: string;
  missionType?: string;
  category?: string;
  factionGuid?: string;
  illegal?: boolean;
  canBeShared?: boolean;
  rewardUEC?: number | null;
  buyIn?: number | null;
  haulingOrders?: Array<{ resource?: { name?: string }; commodity?: string }>;
  blueprintRewards?: BlueprintRewardRef[];
  systems?: string[];
  locations?: string[] | null;
  destinations?: string[] | null;
  availabilityIndex?: number;
  factionRewardsIndex?: number;
  onceOnly?: boolean;
  maxPlayersPerInstance?: number | null;
  prerequisites?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ScmdbMissionPayload = {
  _meta?: ScmdbMeta;
  version?: string;
  contracts?: ScmdbContract[];
  legacyContracts?: ScmdbContract[];
  factions?: Record<string, { name?: string }>;
  locationPools?: Record<string, ScmdbLocationEntry>;
  blueprintPools?: Record<string, ScmdbBlueprintPoolEntry>;
  availabilityPools?: ScmdbAvailability[];
  factionRewardsPools?: Array<Array<{ amount?: number }>>;
  [key: string]: unknown;
};

export type MissionKind = "contract" | "legacy";

export type MissionTableRow = {
  kind: MissionKind;
  id: string;
  system: string;
  title: string;
  faction: string;
  missionType: string;
  tags: string;
  inOut: string;
  hasBlueprints: boolean;
  baseXp: number | "—";
  reward: string;
  legal: "✓" | "✗";
  raw: ScmdbContract;
};

export type ResolvedBlueprintPool = {
  poolLabel: string;
  /** Original SCMDb id string when it differs from the readable title */
  poolLabelRaw?: string;
  chance: number;
  itemNames: string[];
};

const BLUEPRINT_POOL_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Turn internal SCMDb pool ids (e.g. BP_MISSIONREWARD_HeadHunters_MercenaryFPS_…) into readable titles.
 */
export function humanizeBlueprintPoolName(raw: string): string {
  if (!raw?.trim()) return "Reward pool";
  const t = raw.trim();
  if (BLUEPRINT_POOL_UUID_RE.test(t)) {
    return `Reward pool (${t.slice(0, 8)}…)`;
  }
  let s = t
    .replace(/^BP_MISSIONREWARD_/i, "")
    .replace(/^MISSIONREWARD_/i, "")
    .replace(/^BP_/i, "");
  s = s.replace(/_/g, " ");
  s = s.replace(/([a-z\d])([A-Z])/g, "$1 $2");
  s = s.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return "Reward pool";
  return titleCaseBlueprintPoolWords(s);
}

function titleCaseBlueprintPoolWords(s: string): string {
  const upperWords = new Set([
    "fps",
    "lmg",
    "smg",
    "pvp",
    "pve",
    "uec",
    "qt",
    "cpu",
    "all",
  ]);
  return s
    .split(" ")
    .filter(Boolean)
    .map((w) => {
      const low = w.toLowerCase();
      if (upperWords.has(low)) return low.toUpperCase();
      if (/^[a-z0-9]+$/i.test(w) && /[0-9]/.test(w)) return w.toUpperCase();
      if (w.length <= 2 && /^[A-Z]+$/i.test(w)) return w.toUpperCase();
      return low.charAt(0).toUpperCase() + low.slice(1);
    })
    .join(" ");
}

/** Shown where recipe data is not in SCMDb — crafting happens in-game at fabricators. */
export const BLUEPRINT_INGAME_CRAFT_SUMMARY =
  "Material recipes are not in this dataset. In-game: take the blueprint print to a compatible industry fabricator, select it from your inventory, and the fabricator UI lists required refined materials and quantities. After manufacturing, equip FPS items at a loadout manager; install ship components while docked.";

export function resolveContractBlueprints(
  contract: ScmdbContract,
  blueprintPools: Record<string, ScmdbBlueprintPoolEntry> | undefined
): ResolvedBlueprintPool[] {
  const pools = blueprintPools ?? {};
  const refs = contract.blueprintRewards ?? [];
  return refs.map((r) => {
    const pool = r.blueprintPool ? pools[r.blueprintPool] : undefined;
    const rawLabel = String(
      r.poolName || pool?.name || r.blueprintPool || "Unknown pool"
    ).trim();
    const poolLabel = humanizeBlueprintPoolName(rawLabel);
    const poolLabelRaw = poolLabel === rawLabel ? undefined : rawLabel;
    const itemNames = (pool?.blueprints ?? [])
      .map((b) => b.name)
      .filter((n): n is string => typeof n === "string" && n.length > 0);
    return { poolLabel, poolLabelRaw, chance: r.chance ?? 1, itemNames };
  });
}

function abbrevResourceName(name: string): string {
  return name
    .replace(/\s*\(.*?\)\s*/g, "")
    .trim()
    .split(/[\s,]+/)[0]
    .substring(0, 4)
    .toUpperCase();
}

function haulingBadgesFromOrders(
  orders: ScmdbContract["haulingOrders"]
): Array<{ label: string; count: number }> | null {
  if (!orders?.length) return null;
  const counts: Record<string, number> = {};
  for (const o of orders) {
    const u = o.resource?.name || o.commodity;
    if (!u || u === "<= PLACEHOLDER =>") continue;
    const key = abbrevResourceName(u);
    counts[key] = (counts[key] || 0) + 1;
  }
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}

export function getSystems(
  contract: ScmdbContract,
  locationPools: Record<string, ScmdbLocationEntry>
): string[] {
  if (contract.systems?.length) return [...new Set(contract.systems)];
  const set = new Set<string>();
  const add = (id: string) => {
    const loc = locationPools[id];
    if (!loc) return;
    if (loc.type === "Star" && loc.name) set.add(loc.name);
    else if (loc.system) set.add(loc.system);
  };
  for (const id of contract.locations || []) add(id);
  for (const id of contract.destinations || []) add(id);
  return [...set];
}

function getAvailability(
  contract: ScmdbContract,
  availabilityPools: ScmdbAvailability[] | undefined
): ScmdbAvailability {
  if (
    contract.onceOnly !== undefined ||
    contract.maxPlayersPerInstance !== undefined
  ) {
    return {
      onceOnly: !!contract.onceOnly,
      maxPlayersPerInstance: contract.maxPlayersPerInstance ?? null,
    };
  }
  const idx = contract.availabilityIndex;
  const p =
    typeof idx === "number" ? availabilityPools?.[idx] : undefined;
  return p
    ? {
        onceOnly: !!p.onceOnly,
        maxPlayersPerInstance: p.maxPlayersPerInstance ?? null,
      }
    : { onceOnly: false, maxPlayersPerInstance: null };
}

function baseRepXp(
  contract: ScmdbContract,
  factionRewardsPools: ScmdbMissionPayload["factionRewardsPools"]
): number {
  const idx = contract.factionRewardsIndex;
  const pool =
    typeof idx === "number" ? factionRewardsPools?.[idx] : undefined;
  if (!pool?.length) return 0;
  return pool.reduce((s, e) => s + ((e.amount ?? 0) > 0 ? (e.amount ?? 0) : 0), 0);
}

function formatTags(
  contract: ScmdbContract,
  availability: ScmdbAvailability
): string {
  const tags: string[] = [];
  if (contract.canBeShared === false) tags.push("SOLO");
  if (availability.onceOnly) tags.push("UNQ");
  if (contract.illegal) tags.push("ILL");
  return tags.length ? tags.join(" ") : "—";
}

function formatInOut(badges: Array<{ label: string; count: number }> | null): string {
  if (!badges?.length) return "—";
  return badges
    .map((b) => (b.count > 1 ? `${b.count}×${b.label}` : b.label))
    .join(" ");
}

function formatInOutWithBlueprints(
  badges: Array<{ label: string; count: number }> | null,
  hasBlueprints: boolean
): string {
  const haul = formatInOut(badges);
  if (hasBlueprints) {
    if (haul === "—") return "🔧BP";
    return `${haul} 🔧BP`;
  }
  return haul;
}

export function formatMissionReward(uec: number | null | undefined): string {
  if (uec == null) return "—";
  return `${Number(uec).toLocaleString("en-US")} aUEC`;
}

export function contractToTableRow(
  contract: ScmdbContract,
  kind: MissionKind,
  data: ScmdbMissionPayload
): MissionTableRow | null {
  const id = contract.id;
  if (!id) return null;

  const factions = data.factions ?? {};
  const locationPools = data.locationPools ?? {};
  const availabilityPools = data.availabilityPools;
  const factionRewardsPools = data.factionRewardsPools;

  const availability = getAvailability(contract, availabilityPools);
  const badges = haulingBadgesFromOrders(contract.haulingOrders);
  const systems = getSystems(contract, locationPools);
  const factionGuid = contract.factionGuid;
  const faction =
    (factionGuid && factions[factionGuid]?.name) || "—";
  const repXp = baseRepXp(contract, factionRewardsPools);
  const hasBlueprints = (contract.blueprintRewards?.length ?? 0) > 0;

  return {
    kind,
    id,
    system: systems.length ? systems.join(", ") : "—",
    title: contract.title || "—",
    faction,
    missionType: contract.missionType || "—",
    tags: formatTags(contract, availability),
    inOut: formatInOutWithBlueprints(badges, hasBlueprints),
    hasBlueprints,
    baseXp: repXp > 0 ? repXp : "—",
    reward: formatMissionReward(contract.rewardUEC ?? undefined),
    legal: contract.illegal ? "✗" : "✓",
    raw: contract,
  };
}

export function payloadToTableRows(data: ScmdbMissionPayload): MissionTableRow[] {
  const rows: MissionTableRow[] = [];
  for (const c of data.contracts ?? []) {
    const r = contractToTableRow(c, "contract", data);
    if (r) rows.push(r);
  }
  for (const c of data.legacyContracts ?? []) {
    const r = contractToTableRow(c, "legacy", data);
    if (r) rows.push(r);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Blueprint catalog extraction — used by the /blueprints page
// ---------------------------------------------------------------------------

export type BlueprintDropSource = {
  contractId: string;
  contractTitle: string;
  missionType: string;
  faction: string;
  system: string;
  chance: number;
  legal: boolean;
};

export type BlueprintCatalogItem = {
  name: string;
  weight: number;
  poolId: string;
  /** Readable pool title (humanized from BP_MISSIONREWARD_… ids) */
  poolName: string;
  /** Original pool name from JSON when different from poolName */
  poolNameRaw?: string;
  dropSources: BlueprintDropSource[];
};

export type BlueprintPoolView = {
  poolId: string;
  poolName: string;
  poolNameRaw?: string;
  items: Array<{ name: string; weight: number }>;
  dropSources: BlueprintDropSource[];
};

export function extractBlueprintPools(data: ScmdbMissionPayload): BlueprintPoolView[] {
  const pools = data.blueprintPools ?? {};
  const factions = data.factions ?? {};
  const locPools = data.locationPools ?? {};

  const poolDrops = new Map<string, BlueprintDropSource[]>();
  for (const c of [...(data.contracts ?? []), ...(data.legacyContracts ?? [])]) {
    for (const ref of c.blueprintRewards ?? []) {
      if (!ref.blueprintPool) continue;
      const fGuid = c.factionGuid;
      const systems = getSystems(c, locPools);
      const src: BlueprintDropSource = {
        contractId: c.id ?? "",
        contractTitle: c.title ?? "—",
        missionType: c.missionType ?? "—",
        faction: (fGuid && factions[fGuid]?.name) || "—",
        system: systems.length ? systems.join(", ") : "—",
        chance: ref.chance ?? 1,
        legal: !c.illegal,
      };
      if (!poolDrops.has(ref.blueprintPool)) poolDrops.set(ref.blueprintPool, []);
      poolDrops.get(ref.blueprintPool)!.push(src);
    }
  }

  return Object.entries(pools)
    .map(([poolId, pool]) => {
      const rawName = (pool.name ?? poolId).trim();
      const poolName = humanizeBlueprintPoolName(rawName);
      const poolNameRaw = poolName === rawName ? undefined : rawName;
      return {
        poolId,
        poolName,
        poolNameRaw,
        items: (pool.blueprints ?? [])
          .filter((b) => typeof b.name === "string" && b.name.length > 0)
          .map((b) => ({ name: b.name!, weight: b.weight ?? 1 })),
        dropSources: poolDrops.get(poolId) ?? [],
      };
    })
    .sort((a, b) => a.poolName.localeCompare(b.poolName));
}

export function extractBlueprintItems(data: ScmdbMissionPayload): BlueprintCatalogItem[] {
  const poolViews = extractBlueprintPools(data);
  const items: BlueprintCatalogItem[] = [];
  for (const pv of poolViews) {
    if (pv.items.length === 0) {
      items.push({
        name: pv.poolName,
        weight: 1,
        poolId: pv.poolId,
        poolName: pv.poolName,
        poolNameRaw: pv.poolNameRaw,
        dropSources: pv.dropSources,
      });
      continue;
    }
    for (const it of pv.items) {
      items.push({
        name: it.name,
        weight: it.weight,
        poolId: pv.poolId,
        poolName: pv.poolName,
        poolNameRaw: pv.poolNameRaw,
        dropSources: pv.dropSources,
      });
    }
  }
  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}

/** Plain-text preview of description (strip SCMDb EM4 markers). */
export function flattenDescription(description: string | undefined): string {
  if (!description) return "";
  return description
    .replace(/<EM4>(.*?)<\/EM4>/gi, "$1")
    .replace(/\\n/g, "\n");
}

export function gameVersionLabel(
  data: ScmdbMissionPayload | null | undefined
): string {
  if (!data) return "—";
  return data._meta?.version ?? data.version ?? "unknown";
}
