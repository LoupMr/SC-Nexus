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

export function getAllItems(): DatabaseItem[] {
  return dataEntries.flatMap(({ category, subcategory, items }) =>
    tagItems(items as unknown as Record<string, unknown>[], category, subcategory)
  );
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
};

const SKIP_KEYS = new Set(["Name", "category", "subcategory"]);

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
