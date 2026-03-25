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
  chance: number;
  itemNames: string[];
};

export function resolveContractBlueprints(
  contract: ScmdbContract,
  blueprintPools: Record<string, ScmdbBlueprintPoolEntry> | undefined
): ResolvedBlueprintPool[] {
  const pools = blueprintPools ?? {};
  const refs = contract.blueprintRewards ?? [];
  return refs.map((r) => {
    const pool = r.blueprintPool ? pools[r.blueprintPool] : undefined;
    const poolLabel =
      r.poolName || pool?.name || r.blueprintPool || "Unknown pool";
    const itemNames = (pool?.blueprints ?? [])
      .map((b) => b.name)
      .filter((n): n is string => typeof n === "string" && n.length > 0);
    return { poolLabel, chance: r.chance ?? 1, itemNames };
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
