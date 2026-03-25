#!/usr/bin/env node
/**
 * Builds app/src/lib/ships-data.generated.ts from app/src/data/ships.raw.json
 *
 * Refresh sources (network):
 *   REFRESH_SHIPS=1 node scripts/generate-ships.mjs
 *
 * Offline / CI (use committed ships.raw.json only):
 *   FLEETYARDS_OFFLINE=1 node scripts/generate-ships.mjs
 *
 * FLEETYARDS_ROOT: optional path to fleetyards clone (used only to prefer local
 * public/models.json for slugs when implementing hybrid; currently API list is used).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..");
const RAW_JSON = path.join(APP_ROOT, "src", "data", "ships.raw.json");
const OUT_TS = path.join(APP_ROOT, "src", "lib", "ships-data.generated.ts");
const OUT_COMPAT = path.join(APP_ROOT, "src", "lib", "ship-armory-compat.generated.ts");

const API_BASE = "https://api.fleetyards.net/v1";

const TYPE_TO_ARMORY = {
  weapons: { category: "Vehicle_Weaponry", subcategory: "Weapons", label: "Weapons" },
  turrets: { category: "Vehicle_Weaponry", subcategory: "Turrets", label: "Turrets" },
  missiles: { category: "Vehicle_Weaponry", subcategory: "Missiles", label: "Missiles" },
  power_plants: { category: "Vehicle_Components", subcategory: "PowerPlants", label: "Power Plants" },
  coolers: { category: "Vehicle_Components", subcategory: "Coolers", label: "Coolers" },
  shield_generators: { category: "Vehicle_Components", subcategory: "Shields", label: "Shields" },
  quantum_drives: { category: "Vehicle_Components", subcategory: "QuantumDrives", label: "Quantum Drives" },
  jump_modules: { category: "Vehicle_Components", subcategory: "JumpDrives", label: "Jump Drives" },
  bombs: { category: "Vehicle_Weaponry", subcategory: "Bombs", label: "Bombs" },
  bomb_bays: { category: "Vehicle_Weaponry", subcategory: "BombLaunchers", label: "Bomb Launchers" },
};

function parseSizeNum(hp) {
  const label = String(hp.sizeLabel || "");
  const paren = label.match(/\((\d+)\)/);
  if (paren) return parseInt(paren[1], 10);
  const plain = label.match(/^(\d+)$/);
  if (plain) return parseInt(plain[1], 10);
  const map = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    vehicle: 0,
    snub: 0,
    small: 1,
    medium: 2,
    large: 3,
    capital: 4,
    tbd: 0,
  };
  const s = hp.size;
  if (typeof s === "string" && map[s] !== undefined) return map[s];
  return 0;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function refreshFromApi() {
  const ships = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const list = await fetchJson(`${API_BASE}/models?per_page=${perPage}&page=${page}`);
    if (!Array.isArray(list) || list.length === 0) break;
    for (const m of list) {
      const slug = m.slug;
      if (!slug) continue;
      try {
        const detail = await fetchJson(`${API_BASE}/models/${encodeURIComponent(slug)}`);
        let hardpoints = [];
        try {
          hardpoints = await fetchJson(
            `${API_BASE}/models/${encodeURIComponent(slug)}/hardpoints`
          );
        } catch {
          hardpoints = [];
        }
        ships.push(normalizeShip(detail, hardpoints));
        await sleep(40);
      } catch (e) {
        console.warn("skip", slug, e.message);
      }
    }
    if (list.length < perPage) break;
    page += 1;
    await sleep(80);
  }
  ships.sort((a, b) => a.name.localeCompare(b.name));
  fs.mkdirSync(path.dirname(RAW_JSON), { recursive: true });
  fs.writeFileSync(RAW_JSON, JSON.stringify(ships, null, 0), "utf8");
  console.log(`Wrote ${RAW_JSON} (${ships.length} ships)`);
}

function normalizeShip(detail, hardpoints) {
  const manufacturer = detail.manufacturer?.name || detail.manufacturer?.longName || "";
  const groups = new Map();
  for (const hp of hardpoints || []) {
    const type = hp.type;
    const arm = TYPE_TO_ARMORY[type];
    const sizeNum = parseSizeNum(hp);
    const slots = Number(hp.itemSlots) || 1;
    const key = arm ? `${type}|${sizeNum}` : `raw|${type}|${sizeNum}`;
    if (!groups.has(key)) {
      groups.set(key, {
        fleetyardsType: type,
        label: arm ? arm.label : humanizeType(type),
        count: 0,
        size: sizeNum,
        category: arm?.category ?? null,
        subcategory: arm?.subcategory ?? null,
        group: hp.group || null,
      });
    }
    groups.get(key).count += slots;
  }

  const groupedHardpoints = [...groups.values()].sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  return {
    slug: detail.slug,
    name: detail.name,
    manufacturer,
    classification: detail.classificationLabel || detail.classification || "",
    focus: detail.focus || "",
    description: (detail.description || "").slice(0, 500),
    crewMin: detail.minCrew ?? detail.crew?.min ?? null,
    crewMax: detail.maxCrew ?? detail.crew?.max ?? null,
    mass: detail.mass ?? null,
    length: detail.length ?? null,
    beam: detail.beam ?? null,
    height: detail.height ?? null,
    scmSpeed: detail.scmSpeed ?? detail.speeds?.scm ?? null,
    cargo: detail.cargo ?? null,
    storeImage: detail.storeImageMedium || detail.storeImageSmall || detail.storeImage || null,
    erkulIdentifier: detail.erkulIdentifier || detail.scIdentifier || null,
    fleetyardsUrl: detail.links?.frontend || null,
    hardpoints: groupedHardpoints,
  };
}

function humanizeType(t) {
  if (!t) return "Other";
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function emitTs(ships) {
  const json = JSON.stringify(ships);
  return `// AUTO-GENERATED by scripts/generate-ships.mjs — do not edit
// Run: node scripts/generate-ships.mjs
// Refresh from API: REFRESH_SHIPS=1 node scripts/generate-ships.mjs

export type ShipFromJson = {
  slug: string;
  name: string;
  manufacturer: string;
  classification: string;
  focus: string;
  description: string;
  crewMin: number | null;
  crewMax: number | null;
  mass: number | null;
  length: number | null;
  beam: number | null;
  height: number | null;
  scmSpeed: number | null;
  cargo: number | null;
  storeImage: string | null;
  erkulIdentifier: string | null;
  fleetyardsUrl: string | null;
  hardpoints: readonly {
    fleetyardsType: string;
    label: string;
    count: number;
    size: number;
    category: string | null;
    subcategory: string | null;
    group: string | null;
  }[];
};

export const shipsData = ${json} as readonly ShipFromJson[];
`;
}

/** category|subcategory|hardpointSize → ship slugs (for armory item ↔ ship compatibility). */
function emitArmoryCompatTs(ships) {
  const index = {};
  const labels = {};
  for (const ship of ships) {
    labels[ship.slug] = {
      name: ship.name,
      manufacturer: ship.manufacturer || "",
    };
    for (const hp of ship.hardpoints || []) {
      if (!hp.category || !hp.subcategory) continue;
      const k = `${hp.category}|${hp.subcategory}|${hp.size}`;
      if (!index[k]) index[k] = new Set();
      index[k].add(ship.slug);
    }
  }
  const indexObj = {};
  for (const k of Object.keys(index).sort()) {
    indexObj[k] = [...index[k]].sort();
  }
  const jsonIdx = JSON.stringify(indexObj);
  const jsonLbl = JSON.stringify(labels);
  return `// AUTO-GENERATED by scripts/generate-ships.mjs — do not edit
// Maps category|subcategory|hardpointSize → ship slugs (same matching rules as armory hardpoint links).

export const shipArmoryCompatIndex: Record<string, readonly string[]> = ${jsonIdx};

export const shipArmoryCompatLabels: Record<string, { readonly name: string; readonly manufacturer: string }> =
  ${jsonLbl};
`;
}

async function main() {
  const offline = process.env.FLEETYARDS_OFFLINE === "1";
  const refresh = process.env.REFRESH_SHIPS === "1";

  if (refresh && !offline) {
    await refreshFromApi();
  }

  if (!fs.existsSync(RAW_JSON)) {
    console.error(
      "Missing ships.raw.json. Run REFRESH_SHIPS=1 node scripts/generate-ships.mjs once (requires network)."
    );
    process.exit(1);
  }

  const ships = JSON.parse(fs.readFileSync(RAW_JSON, "utf8"));
  if (!Array.isArray(ships) || ships.length === 0) {
    console.error("ships.raw.json must be a non-empty array");
    process.exit(1);
  }

  fs.writeFileSync(OUT_TS, emitTs(ships), "utf8");
  console.log(`Generated ${OUT_TS} (${ships.length} ships)`);
  fs.writeFileSync(OUT_COMPAT, emitArmoryCompatTs(ships), "utf8");
  console.log(`Generated ${OUT_COMPAT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
