import coolers from "@/data/Vehicle_Components/COOLERS.json";
import flightblades from "@/data/Vehicle_Components/FLIGHTBLADES.json";
import jumpdrives from "@/data/Vehicle_Components/JUMPDRIVES.json";
import lifesupport from "@/data/Vehicle_Components/LIFESUPPORTGENERATORS.json";
import powerplants from "@/data/Vehicle_Components/POWERPLANTS.json";
import quantumdrives from "@/data/Vehicle_Components/QUANTUMDRIVES.json";
import shields from "@/data/Vehicle_Components/SHIELDS.json";
import bombs from "@/data/Vehicle_Weaponry/BOMBS.json";
import bomblaunchers from "@/data/Vehicle_Weaponry/BOMBLAUNCHERS.json";
import missiles from "@/data/Vehicle_Weaponry/MISSILES.json";
import missileracks from "@/data/Vehicle_Weaponry/MISSILERACKS.json";
import turrets from "@/data/Vehicle_Weaponry/TURRETS.json";
import weapons from "@/data/Vehicle_Weaponry/WEAPONS.json";
import miscellaneous from "@/data/Other/MISCELLANOUS.json";

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

export const categories = [
  { id: "all", label: "All Items" },
  { id: "Vehicle_Weaponry", label: "Ship Weapons" },
  { id: "Vehicle_Components", label: "Ship Components" },
  { id: "Other", label: "Miscellaneous" },
] as const;

export const subcategories = [
  { id: "Weapons", label: "Weapons", category: "Vehicle_Weaponry" },
  { id: "Missiles", label: "Missiles", category: "Vehicle_Weaponry" },
  { id: "MissileRacks", label: "Missile Racks", category: "Vehicle_Weaponry" },
  { id: "Turrets", label: "Turrets", category: "Vehicle_Weaponry" },
  { id: "Bombs", label: "Bombs", category: "Vehicle_Weaponry" },
  { id: "BombLaunchers", label: "Bomb Launchers", category: "Vehicle_Weaponry" },
  { id: "Shields", label: "Shields", category: "Vehicle_Components" },
  { id: "PowerPlants", label: "Power Plants", category: "Vehicle_Components" },
  { id: "Coolers", label: "Coolers", category: "Vehicle_Components" },
  { id: "QuantumDrives", label: "Quantum Drives", category: "Vehicle_Components" },
  { id: "JumpDrives", label: "Jump Drives", category: "Vehicle_Components" },
  { id: "FlightBlades", label: "Flight Blades", category: "Vehicle_Components" },
  { id: "LifeSupport", label: "Life Support", category: "Vehicle_Components" },
  { id: "Miscellaneous", label: "Miscellaneous", category: "Other" },
] as const;

export function getAllItems(): DatabaseItem[] {
  return [
    ...tagItems(weapons as Record<string, unknown>[], "Vehicle_Weaponry", "Weapons"),
    ...tagItems(missiles as Record<string, unknown>[], "Vehicle_Weaponry", "Missiles"),
    ...tagItems(missileracks as Record<string, unknown>[], "Vehicle_Weaponry", "MissileRacks"),
    ...tagItems(turrets as Record<string, unknown>[], "Vehicle_Weaponry", "Turrets"),
    ...tagItems(bombs as Record<string, unknown>[], "Vehicle_Weaponry", "Bombs"),
    ...tagItems(bomblaunchers as Record<string, unknown>[], "Vehicle_Weaponry", "BombLaunchers"),
    ...tagItems(shields as Record<string, unknown>[], "Vehicle_Components", "Shields"),
    ...tagItems(powerplants as Record<string, unknown>[], "Vehicle_Components", "PowerPlants"),
    ...tagItems(coolers as Record<string, unknown>[], "Vehicle_Components", "Coolers"),
    ...tagItems(quantumdrives as Record<string, unknown>[], "Vehicle_Components", "QuantumDrives"),
    ...tagItems(jumpdrives as Record<string, unknown>[], "Vehicle_Components", "JumpDrives"),
    ...tagItems(flightblades as Record<string, unknown>[], "Vehicle_Components", "FlightBlades"),
    ...tagItems(lifesupport as Record<string, unknown>[], "Vehicle_Components", "LifeSupport"),
    ...tagItems(miscellaneous as Record<string, unknown>[], "Other", "Miscellaneous"),
  ];
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
