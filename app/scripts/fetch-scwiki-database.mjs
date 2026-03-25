#!/usr/bin/env node
/**
 * Fetches in-game data from the Star Citizen Wiki API into repo-root Database/*.JSON
 * (consumed by scripts/generate-database.mjs).
 *
 * Covers wiki-style groupings:
 * - Ships & Vehicles (/api/vehicles)
 * - Ship components (shields, QD, radars, EMP, mining, etc.)
 * - Ship weapons & ordnance
 * - Personal Weapons (FPS)
 * - Personal Armor (Char_Armor_*)
 * - Weapon Attachments
 *
 * API: https://api.star-citizen.wiki/ · Docs: https://docs.star-citizen.wiki/
 *
 * Usage:
 *   node scripts/fetch-scwiki-database.mjs
 *   node scripts/fetch-scwiki-database.mjs --dry-run
 *
 * Env:
 *   SCWIKI_BASE — default https://api.star-citizen.wiki
 *   SCWIKI_DELAY_MS — delay between pages (default 120)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..");
const DATABASE_ROOT = path.resolve(APP_ROOT, "..", "Database");

const BASE = (process.env.SCWIKI_BASE || "https://api.star-citizen.wiki").replace(/\/$/, "");
const DELAY_MS = Number(process.env.SCWIKI_DELAY_MS || 120);
const DRY = process.argv.includes("--dry-run");

const ARMOR_ITEM_TYPES = [
  "Char_Armor_Torso",
  "Char_Armor_Helmet",
  "Char_Armor_Legs",
  "Char_Armor_Arms",
  "Char_Armor_Backpack",
  "Char_Armor_Undersuit",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function round(n, d = 2) {
  if (n == null || Number.isNaN(n)) return null;
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

function vol(item) {
  return item.dimension?.volume_converted ?? null;
}

function durabilityHealth(item) {
  return item.durability?.health ?? null;
}

function compactLabel(s) {
  if (!s || typeof s !== "string") return "Unknown";
  return s.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "") || "Unknown";
}

function shipWeaponType(item, vw) {
  const t = vw?.type || vw?.class;
  if (t && t.includes(" ")) return compactLabel(t);
  if (vw?.class && vw?.type) return compactLabel(`${vw.class} ${vw.type}`);
  return compactLabel(t || item.sub_type || item.type || "Weapon");
}

function fpsWeaponType(item, pw) {
  const cls = (pw?.class || "").toLowerCase();
  let prefix = "Ballistic";
  if (cls.includes("laser") || cls.includes("energy")) prefix = "Laser";
  else if (cls.includes("plasma")) prefix = "Plasma";
  else if (cls.includes("electron") || cls.includes("distortion")) prefix = "Distortion";
  const kind = compactLabel(pw?.type || item.sub_type || "Weapon");
  if (kind === "Unknown") return `${prefix}Weapon`;
  if (kind.startsWith(prefix)) return kind;
  return `${prefix}${kind}`;
}

function mapShipGun(item) {
  const vw = item.vehicle_weapon;
  if (!vw) return null;
  const dmg = vw.damage || {};
  const alpha = dmg.alpha?.physical ?? dmg.alpha_total ?? vw.damage_per_shot;
  const dps = dmg.dps?.physical ?? vw.modes?.[0]?.damage_per_second;
  const ammo = item.ammunition || {};
  return {
    Name: item.name,
    Type: shipWeaponType(item, vw),
    Size: item.size ?? null,
    Grade: item.grade ?? null,
    Alpha: round(alpha, 3),
    DPS: round(dps, 2),
    Firerate: round(vw.rpm ?? vw.modes?.[0]?.rounds_per_minute, 2),
    Range: round(vw.range ?? ammo.range, 2),
    AmmoSpeed: round(ammo.speed, 2),
    Volume: vol(item),
  };
}

function mapFpsWeapon(item) {
  if (!item.classification?.startsWith?.("FPS.Weapon")) return null;
  const pw = item.personal_weapon;
  if (!pw) return null;
  const dmg = pw.damage || {};
  const alpha = dmg.alpha?.physical ?? dmg.alpha_total ?? pw.damage_per_shot;
  const dps = dmg.dps?.physical ?? dmg.dps_total ?? pw.modes?.[0]?.damage_per_second;
  const ammo = item.ammunition || {};
  return {
    Name: item.name,
    Type: fpsWeaponType(item, pw),
    Size: item.size ?? null,
    Grade: item.grade ?? "A",
    Alpha: round(alpha, 3),
    DPS: round(dps, 2),
    Firerate: round(pw.rpm ?? pw.modes?.[0]?.rounds_per_minute ?? pw.rof, 2),
    Range: round(pw.range ?? ammo.range, 2),
    AmmoSpeed: round(ammo.speed, 2),
    Volume: vol(item),
  };
}

function mapShield(item) {
  const sh = item.shield;
  if (!sh) return null;
  return {
    Name: item.name,
    Size: item.size ?? null,
    Grade: item.grade ?? null,
    Class: item.class ?? null,
    Durability: durabilityHealth(item),
    MaxShieldHP: sh.max_health ?? sh.max_shield_health ?? null,
    Regen: round(sh.regen_rate ?? sh.max_shield_regen, 2),
    DelayDamaged: round(sh.regen_delay?.damage, 2),
    DelayDowned: round(sh.regen_delay?.downed, 2),
    Volume: vol(item),
  };
}

function mapPowerPlant(item) {
  const pp = item.power_plant;
  if (!pp) return null;
  return {
    Name: item.name,
    Size: item.size ?? null,
    Grade: item.grade ?? null,
    Class: item.class ?? null,
    Durability: durabilityHealth(item),
    PowerGeneration: pp.power_segment_generation ?? null,
    CoolantDraw: 0,
    Volume: vol(item),
  };
}

function mapCooler(item) {
  const c = item.cooler;
  if (!c) return null;
  return {
    Name: item.name,
    Size: item.size ?? null,
    Grade: item.grade ?? null,
    Class: item.class ?? null,
    Durability: durabilityHealth(item),
    CoolingRate: c.coolant_segment_generation ?? null,
    Volume: vol(item),
  };
}

function mapQuantumDrive(item) {
  const qd = item.quantum_drive;
  if (!qd) return null;
  const sj = qd.standard_jump || qd.modes?.find((m) => m.type === "normal_jump") || {};
  const fuel = qd.fuel_consumption_scu_per_gm;
  return {
    Name: item.name,
    Size: item.size ?? null,
    Grade: item.grade ?? null,
    Class: item.class ?? null,
    Durability: durabilityHealth(item),
    Speed: sj.drive_speed ?? null,
    QTFuelRequirement: fuel != null ? round(fuel * 1000, 3) : null,
    AccelerationStage1: sj.stage_one_accel_rate ?? null,
    AccelerationStage2: sj.stage_two_accel_rate ?? null,
    Volume: vol(item),
  };
}

function mapJumpDrive(item) {
  const jd = item.jump_drive;
  if (!jd) return null;
  return {
    Name: item.name,
    Size: item.size ?? null,
    Grade: item.grade ?? null,
    Class: item.class ?? null,
    Durability: durabilityHealth(item),
    QuantumFuelDraw: 0,
    AlignmentRate: round(jd.alignment_rate, 3),
    TuningRate: round(jd.tuning_rate, 3),
    Volume: vol(item),
  };
}

function mapLifeSupport(item) {
  const rate = extractLifeSupportGeneration(item.resource_network);
  if (rate == null) return null;
  return {
    Name: item.name,
    Size: item.size ?? null,
    LifeSupportGeneration: round(rate, 3),
    Volume: vol(item) ?? round(item.dimension?.volume, 6),
  };
}

function extractLifeSupportGeneration(rn) {
  if (!rn?.states) return null;
  for (const st of rn.states) {
    for (const d of st.deltas || []) {
      if (d.generated_resource === "LifeSupport" && d.generated_rate != null) return d.generated_rate;
    }
  }
  return null;
}

function mapMissile(item) {
  const m = item.missile;
  if (!m) return null;
  return {
    Name: item.name,
    Size: item.size ?? null,
    Grade: item.grade ?? null,
    Type: m.signal_type || "Unknown",
    MinimumLockDistance: round(m.lock_range_min ?? m.target_lock?.range_min, 2),
    MaximumLockDistance: round(m.lock_range_max ?? m.target_lock?.range_max, 2),
    MinimumTrackingSignal: round(m.tracking_signal_min, 2),
    DMG: m.damage_total ?? null,
    Volume: vol(item),
  };
}

function mapTurret(item) {
  const t = item.turret;
  if (!t) return null;
  return {
    Name: item.name,
    Size: item.size ?? null,
    Grade: item.grade ?? null,
    PortCount: item.max_mounts ?? t.mounts ?? null,
    PortSize: item.max_size ?? t.max_size ?? null,
    Volume: vol(item),
  };
}

function mapBomb(item) {
  const b = item.bomb;
  if (!b) return null;
  return {
    Name: item.name,
    Size: item.size ?? null,
    Grade: item.grade ?? null,
    Volume: vol(item),
  };
}

function mapBombLauncher(item) {
  return {
    Name: item.name,
    Size: item.size ?? null,
    Grade: item.grade ?? null,
    Volume: vol(item),
  };
}

function mapMissileRack(item) {
  return {
    Name: item.name,
    Size: item.size ?? null,
    MissileCount: item.max_missiles ?? item.missile_rack?.missile_count ?? null,
    MissileSize: item.max_size ?? item.min_size ?? item.missile_rack?.missile_size ?? null,
    Volume: vol(item),
  };
}

function mapFlightBlade(item) {
  return {
    Name: item.name,
    Size: item.size ?? null,
    Volume: vol(item),
  };
}

function mapGenericComponent(item) {
  return {
    Name: item.name,
    Type: item.type ?? null,
    Size: item.size ?? null,
    Grade: item.grade ?? null,
    Class: item.class ?? null,
    Classification: item.classification ?? null,
    Durability: durabilityHealth(item),
    Volume: vol(item),
  };
}

function mapVehicle(v) {
  return {
    Name: v.name ?? v.game_name,
    GameName: v.game_name ?? null,
    Manufacturer: v.manufacturer?.name ?? null,
    Career: v.career ?? null,
    Role: v.role ?? null,
    Size: v.size ?? v.size_class ?? null,
    Type: v.type ?? null,
    IsSpaceship: v.is_spaceship ?? null,
    IsGroundVehicle: v.is_vehicle ?? null,
    IsGravlev: v.is_gravlev ?? null,
    CargoSCU: v.cargo_capacity ?? null,
    CrewMin: v.crew?.min ?? null,
    CrewMax: v.crew?.max ?? null,
    Health: v.health ?? null,
    SCM: v.speed?.scm ?? null,
    MaxSpeed: v.speed?.max ?? null,
    MassTotal: v.mass_total ?? null,
    ProductionStatus: v.production_status ?? null,
    ScWikiUrl: v.web_url ?? null,
  };
}

function mapPersonalArmorItem(item) {
  const sa = item.suit_armor || item.clothing;
  const drm = sa?.damage_resistance_map;
  return {
    Name: item.name,
    Slot: sa?.slot ?? (item.type?.startsWith("Char_Armor_") ? item.type.replace("Char_Armor_", "") : item.type) ?? null,
    ArmorType: sa?.armor_type ?? null,
    Size: item.size ?? null,
    Grade: item.grade ?? null,
    PhysicalResist: drm?.physical != null ? round(drm.physical, 2) : null,
    EnergyResist: drm?.energy != null ? round(drm.energy, 2) : null,
    DistortionResist: drm?.distortion != null ? round(drm.distortion, 2) : null,
    Volume: vol(item),
    ScWikiUrl: item.web_url ?? null,
  };
}

function mapWeaponAttachmentRow(item) {
  return {
    Name: item.name,
    AttachmentType: item.sub_type ?? item.type ?? null,
    Position: item.position ?? null,
    Size: item.size ?? null,
    Grade: item.grade ?? null,
    Volume: vol(item),
    ScWikiUrl: item.web_url ?? null,
  };
}

async function fetchApi(path, searchParams) {
  const u = new URL(`${BASE}${path}`);
  for (const [k, v] of searchParams) u.searchParams.append(k, v);
  const res = await fetch(u);
  if (!res.ok) throw new Error(`SC Wiki API ${res.status} ${u}`);
  return res.json();
}

async function fetchItemsPage(params) {
  return fetchApi("/api/items", params);
}

async function fetchVehiclesPage(params) {
  return fetchApi("/api/vehicles", params);
}

async function peekArmorTypesTotal() {
  let n = 0;
  for (const t of ARMOR_ITEM_TYPES) {
    const p = new URLSearchParams();
    p.set("page[size]", "1");
    p.set("page[number]", "1");
    p.set("filter[type]", t);
    const json = await fetchItemsPage(p);
    n += json.meta?.total ?? 0;
    await sleep(40);
  }
  return n;
}

/**
 * @param {Record<string, string | number>} query
 * @param {(item: object) => object | null} mapFn
 */
async function collectMapped(query, mapFn) {
  const out = [];
  let page = 1;
  const pageSize = 200;
  for (;;) {
    const params = new URLSearchParams();
    params.set("page[size]", String(pageSize));
    params.set("page[number]", String(page));
    for (const [k, v] of Object.entries(query)) params.set(k, String(v));

    const json = await fetchItemsPage(params);
    for (const item of json.data || []) {
      const row = mapFn(item);
      if (row) out.push(row);
    }
    const last = json.meta?.last_page ?? 1;
    if (page >= last) break;
    page += 1;
    await sleep(DELAY_MS);
  }
  out.sort((a, b) => (a.Name || "").localeCompare(b.Name || "", "en"));
  return out;
}

async function collectVehicles() {
  const out = [];
  let page = 1;
  const pageSize = 200;
  for (;;) {
    const params = new URLSearchParams();
    params.set("page[size]", String(pageSize));
    params.set("page[number]", String(page));
    const json = await fetchVehiclesPage(params);
    for (const v of json.data || []) {
      const row = mapVehicle(v);
      if (row) out.push(row);
    }
    const last = json.meta?.last_page ?? 1;
    if (page >= last) break;
    page += 1;
    await sleep(DELAY_MS);
  }
  out.sort((a, b) => (a.Name || "").localeCompare(b.Name || "", "en"));
  return out;
}

async function collectFpsWeapons() {
  const out = [];
  let page = 1;
  const pageSize = 200;
  for (;;) {
    const params = new URLSearchParams();
    params.set("page[size]", String(pageSize));
    params.set("page[number]", String(page));
    params.set("filter[type]", "WeaponPersonal");

    const json = await fetchItemsPage(params);
    for (const item of json.data || []) {
      const row = mapFpsWeapon(item);
      if (row) out.push(row);
    }
    const last = json.meta?.last_page ?? 1;
    if (page >= last) break;
    page += 1;
    await sleep(DELAY_MS);
  }
  out.sort((a, b) => (a.Name || "").localeCompare(b.Name || "", "en"));
  return out;
}

async function collectPersonalArmor() {
  const rows = [];
  for (const t of ARMOR_ITEM_TYPES) {
    const part = await collectMapped({ "filter[type]": t }, mapPersonalArmorItem);
    rows.push(...part);
    await sleep(DELAY_MS);
  }
  rows.sort((a, b) => (a.Name || "").localeCompare(b.Name || "", "en"));
  return rows;
}

const JOBS = [
  { rel: "Vehicles/SHIPS_AND_VEHICLES.JSON", run: () => collectVehicles(), dryCount: () => fetchVehiclesPage(new URLSearchParams([["page[size]", "1"], ["page[number]", "1"]])).then((j) => j.meta?.total ?? 0) },
  { rel: "Vehicle_Weaponry/WEAPONS.JSON", run: () => collectMapped({ "filter[classification]": "Ship.Weapon.Gun" }, mapShipGun) },
  { rel: "Vehicle_Weaponry/MISSILES.JSON", run: () => collectMapped({ "filter[type]": "Missile" }, mapMissile) },
  { rel: "Vehicle_Weaponry/TURRETS.JSON", run: () => collectMapped({ "filter[type]": "Turret" }, mapTurret) },
  { rel: "Vehicle_Weaponry/BOMBS.JSON", run: () => collectMapped({ "filter[type]": "Bomb" }, mapBomb) },
  { rel: "Vehicle_Weaponry/BOMBLAUNCHERS.JSON", run: () => collectMapped({ "filter[type]": "BombLauncher" }, mapBombLauncher) },
  { rel: "Vehicle_Weaponry/MISSILERACKS.JSON", run: () => collectMapped({ "filter[type]": "MissileLauncher" }, mapMissileRack) },
  { rel: "Vehicle_Components/SHIELDS.JSON", run: () => collectMapped({ "filter[type]": "Shield" }, mapShield) },
  { rel: "Vehicle_Components/POWERPLANTS.JSON", run: () => collectMapped({ "filter[type]": "PowerPlant" }, mapPowerPlant) },
  { rel: "Vehicle_Components/COOLERS.JSON", run: () => collectMapped({ "filter[type]": "Cooler" }, mapCooler) },
  { rel: "Vehicle_Components/QUANTUMDRIVES.JSON", run: () => collectMapped({ "filter[type]": "QuantumDrive" }, mapQuantumDrive) },
  { rel: "Vehicle_Components/JUMPDRIVES.JSON", run: () => collectMapped({ "filter[type]": "JumpDrive" }, mapJumpDrive) },
  { rel: "Vehicle_Components/LIFESUPPORTGENERATORS.JSON", run: () => collectMapped({ "filter[type]": "LifeSupportGenerator" }, mapLifeSupport) },
  { rel: "Vehicle_Components/FLIGHTBLADES.JSON", run: () => collectMapped({ "filter[classification]": "Ship.FlightController" }, mapFlightBlade) },
  { rel: "Vehicle_Components/RADARS.JSON", run: () => collectMapped({ "filter[type]": "Radar" }, mapGenericComponent) },
  { rel: "Vehicle_Components/TRACTORBEAMS.JSON", run: () => collectMapped({ "filter[type]": "TractorBeam" }, mapGenericComponent) },
  { rel: "Vehicle_Components/SELFDESTRUCTS.JSON", run: () => collectMapped({ "filter[type]": "SelfDestruct" }, mapGenericComponent) },
  { rel: "Vehicle_Components/EMPS.JSON", run: () => collectMapped({ "filter[type]": "EMP" }, mapGenericComponent) },
  { rel: "Vehicle_Components/SALVAGEMODIFIERS.JSON", run: () => collectMapped({ "filter[type]": "SalvageModifier" }, mapGenericComponent) },
  { rel: "Vehicle_Components/QUANTUMINTERDICTIONGENERATORS.JSON", run: () => collectMapped({ "filter[type]": "QuantumInterdictionGenerator" }, mapGenericComponent) },
  { rel: "Vehicle_Components/WEAPONDEFENSIVE.JSON", run: () => collectMapped({ "filter[type]": "WeaponDefensive" }, mapGenericComponent) },
  { rel: "Vehicle_Components/WEAPONMINING.JSON", run: () => collectMapped({ "filter[type]": "WeaponMining" }, mapGenericComponent) },
  { rel: "Vehicle_Components/MININGMODIFIERS.JSON", run: () => collectMapped({ "filter[type]": "MiningModifier" }, mapGenericComponent) },
  { rel: "Fpsgadgets_Utilities/FPS_WEAPONS.JSON", run: () => collectFpsWeapons() },
  { rel: "Personal_Armor/PERSONAL_ARMOR.JSON", run: () => collectPersonalArmor(), dryCount: () => peekArmorTypesTotal() },
  { rel: "Weapon_Attachments/WEAPON_ATTACHMENTS.JSON", run: () => collectMapped({ "filter[type]": "WeaponAttachment" }, mapWeaponAttachmentRow) },
];

async function main() {
  console.log(`SC Wiki base: ${BASE}${DRY ? " (dry-run)" : ""}`);

  if (!DRY && !fs.existsSync(DATABASE_ROOT)) {
    console.error("Database directory not found:", DATABASE_ROOT);
    process.exit(1);
  }

  for (const job of JOBS) {
    if (DRY && job.dryCount) {
      const n = await job.dryCount();
      console.log(`${job.rel}: ${n} rows (API total; dry-run)`);
      await sleep(50);
      continue;
    }
    const rows = await job.run();
    console.log(`${job.rel}: ${rows.length} rows`);
    if (!DRY) {
      const dest = path.join(DATABASE_ROOT, job.rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, `${JSON.stringify(rows, null, 4)}\n`, "utf8");
    }
    await sleep(DELAY_MS);
  }

  if (DRY) console.log("Dry-run complete (no files written).");
  else console.log("Wrote Database/*.JSON — run: node scripts/generate-database.mjs");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
