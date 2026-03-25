import { categories, subcategories, dataEntries } from "./database-data.generated";

export interface DatabaseItem {
  Name: string;
  category: string;
  subcategory: string;
  [key: string]: unknown;
}

function tagItems(items: Record<string, unknown>[], category: string, subcategory: string): DatabaseItem[] {
  return items.map((item) => ({
    ...item,
    category,
    subcategory,
    Name: item.Name as string,
  }));
}

export { categories, subcategories };

/** Ship/vehicle hulls — use /ships; excluded from armory browse pool and filters. */
export const ARMORY_OMIT_CATEGORY_IDS: readonly string[] = ["Vehicles"];

/** Wiki / game dump rows with no real name — hide from armory and pickers. */
export function isPlaceholderItemName(name: string): boolean {
  const t = name.trim();
  if (!t) return true;
  if (/^<=\s*PLACEHOLDER\s*=>$/i.test(t)) return true;
  if (/<=\s*PLACEHOLDER\s*=>/i.test(t)) return true;
  if (t.toUpperCase() === "PLACEHOLDER") return true;
  return false;
}

function itemDedupeKey(item: DatabaseItem): string {
  return `${item.category}\x00${item.subcategory}\x00${item.Name.trim().toLowerCase()}`;
}

function flattenEntries(
  entries: readonly { category: string; subcategory: string; items: readonly Record<string, unknown>[] }[]
): DatabaseItem[] {
  const seen = new Set<string>();
  const out: DatabaseItem[] = [];
  for (const { category, subcategory, items } of entries) {
    for (const raw of tagItems(items as unknown as Record<string, unknown>[], category, subcategory)) {
      if (isPlaceholderItemName(raw.Name)) continue;
      const k = itemDedupeKey(raw);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(raw);
    }
  }
  return out;
}

let _catalogCache: DatabaseItem[] | null = null;

/** All armory JSON slices merged (placeholders dropped, light per-bucket dedupe). Cached after first call. */
export function getCatalogItems(): DatabaseItem[] {
  if (!_catalogCache) _catalogCache = flattenEntries(dataEntries);
  return _catalogCache;
}

export function getAllItems(): DatabaseItem[] {
  return getCatalogItems();
}

/** Rows visible for the current category filter (subcategory applied in the client). */
export function getArmoryItemPool(category: string): DatabaseItem[] {
  const omit = new Set(ARMORY_OMIT_CATEGORY_IDS);
  const catalog = getCatalogItems().filter((i) => !omit.has(i.category));
  if (category === "all") {
    return catalog;
  }
  if (omit.has(category)) {
    return [];
  }
  return catalog.filter((i) => i.category === category);
}

const STAT_DISPLAY: Record<string, string> = {
  Size: "Size",
  Grade: "Grade",
  Class: "Class",
  Type: "Type",
  Alpha: "Alpha DMG",
  DPS: "DPS",
  Firerate: "Fire Rate",
  Range: "Range",
  AmmoSpeed: "Ammo Speed",
  DMG: "Damage",
  MinimumLockDistance: "Min Lock",
  MaximumLockDistance: "Max Lock",
  MinimumTrackingSignal: "Track Signal",
  MissileCount: "Missile Count",
  MissileSize: "Missile Size",
  PortCount: "Port Count",
  PortSize: "Port Size",
  Durability: "Durability",
  MaxShieldHP: "Shield HP",
  Regen: "Regen",
  DelayDamaged: "Dmg Delay",
  DelayDowned: "Down Delay",
  PowerGeneration: "Power Gen",
  CoolantDraw: "Coolant Draw",
  CoolingRate: "Cooling Rate",
  Speed: "Speed",
  QTFuelRequirement: "QT Fuel",
  AccelerationStage1: "Accel S1",
  AccelerationStage2: "Accel S2",
  QuantumFuelDraw: "QT Fuel Draw",
  AlignmentRate: "Align Rate",
  TuningRate: "Tune Rate",
  LifeSupportGeneration: "Life Support",
  Volume: "Volume",
  DurationMultiplier: "Duration",
  ErrorChance: "Error Chance",
  Classification: "Classification",
  Manufacturer: "Manufacturer",
  GameName: "Game Name",
  Career: "Career",
  Role: "Role",
  IsSpaceship: "Spaceship",
  IsGroundVehicle: "Ground Vehicle",
  IsGravlev: "Gravlev",
  CargoSCU: "Cargo (SCU)",
  CrewMin: "Crew Min",
  CrewMax: "Crew Max",
  Health: "Health",
  SCM: "SCM Speed",
  MaxSpeed: "Max Speed",
  MassTotal: "Mass",
  ProductionStatus: "Production",
  Slot: "Slot",
  ArmorType: "Armor Type",
  PhysicalResist: "Phys resist",
  EnergyResist: "Energy resist",
  DistortionResist: "Distort resist",
  AttachmentType: "Attachment Type",
  Position: "Position",
};

const SKIP_KEYS = new Set(["Name", "category", "subcategory", "ThumbUrl", "Description", "ScWikiUrl"]);

export function getItemStats(item: DatabaseItem): { label: string; value: unknown }[] {
  return Object.entries(item)
    .filter(([key]) => !SKIP_KEYS.has(key))
    .map(([key, value]) => ({
      label: STAT_DISPLAY[key] || key,
      value,
    }));
}

export function getSubcategoryLabel(id: string): string {
  const sub = subcategories.find((s) => s.id === id);
  return sub?.label ?? id;
}

export function getCategoryLabel(id: string): string {
  const cat = categories.find((c) => c.id === id);
  return cat?.label ?? id;
}

function normalizeCatalogItemName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2018|\u2019/g, "'");
}

let _catalogByNormalizedName: Map<string, DatabaseItem> | null = null;

function getCatalogByNormalizedName(): Map<string, DatabaseItem> {
  if (!_catalogByNormalizedName) {
    _catalogByNormalizedName = new Map();
    for (const it of getCatalogItems()) {
      _catalogByNormalizedName.set(normalizeCatalogItemName(it.Name), it);
    }
  }
  return _catalogByNormalizedName;
}

/** Exact name match against the org Armory JSON catalog (FPS gear, components, etc.). */
export function findCatalogItemByName(name: string): DatabaseItem | undefined {
  const k = normalizeCatalogItemName(name);
  if (!k) return undefined;
  return getCatalogByNormalizedName().get(k);
}
