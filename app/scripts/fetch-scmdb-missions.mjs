#!/usr/bin/env node
/**
 * Downloads the full Star Citizen mission merge from https://scmdb.net/data/
 * and writes public/data/mission_data.json.
 *
 * Live merges often ship without blueprintPools / contract blueprintRewards even when
 * PTU already has them. When fetching **live**, we merge PTU blueprint data on top:
 * - blueprintPools: PTU keys + live overrides where live defines a pool
 * - contracts: copy blueprintRewards from PTU when the same contract id has none on live
 *
 * Usage:
 *   node scripts/fetch-scmdb-missions.mjs           # live + PTU blueprint augmentation
 *   node scripts/fetch-scmdb-missions.mjs --ptu     # PTU merge only (no augmentation)
 *   node scripts/fetch-scmdb-missions.mjs --no-ptu-blueprints  # live only, no PTU merge
 *
 * Run from app/: npm run fetch-missions
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..");
const OUT_FILE = path.join(APP_ROOT, "public", "data", "mission_data.json");
const VERSIONS_URL = "https://scmdb.net/data/versions.json";
const DATA_BASE = "https://scmdb.net/data/";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

/**
 * @param {object} live
 * @param {object} ptu
 * @returns {{ poolsMerged: number, contractsAugmented: number }}
 */
function augmentLiveWithPtuBlueprints(live, ptu) {
  const livePools =
    live.blueprintPools && typeof live.blueprintPools === "object"
      ? live.blueprintPools
      : {};
  const ptuPools =
    ptu.blueprintPools && typeof ptu.blueprintPools === "object"
      ? ptu.blueprintPools
      : {};

  live.blueprintPools = { ...ptuPools, ...livePools };
  const poolsMerged = Object.keys(ptuPools).length;

  const ptuById = new Map((ptu.contracts || []).map((c) => [c.id, c]));
  let contractsAugmented = 0;
  live.contracts = (live.contracts || []).map((c) => {
    if (c.blueprintRewards?.length) return c;
    const pc = ptuById.get(c.id);
    if (pc?.blueprintRewards?.length) {
      contractsAugmented += 1;
      return { ...c, blueprintRewards: pc.blueprintRewards };
    }
    return c;
  });

  return { poolsMerged, contractsAugmented };
}

async function main() {
  const usePtu = process.argv.includes("--ptu");
  const skipBlueprintMerge = process.argv.includes("--no-ptu-blueprints");

  const versions = await fetchJson(VERSIONS_URL);
  if (!Array.isArray(versions) || versions.length === 0) {
    throw new Error("versions.json empty or invalid");
  }

  const ptuEntry = versions.find((v) =>
    String(v.version || "").includes("-ptu")
  );
  const liveEntry = versions.find((v) =>
    String(v.version || "").includes("-live")
  );

  let chosen = usePtu
    ? ptuEntry ?? versions[0]
    : liveEntry ?? versions[0];
  if (!chosen) chosen = versions[0];

  const mergedUrl = `${DATA_BASE}${chosen.file}`;
  console.error(`Fetching ${mergedUrl} (${chosen.version}) …`);
  /** @type {Record<string, unknown>} */
  const data = await fetchJson(mergedUrl);

  /** @type {Record<string, unknown>} */
  const meta = {
    version: chosen.version,
    mergedFile: chosen.file,
    fetchedAt: new Date().toISOString(),
    source: "https://scmdb.net/",
  };

  if (!usePtu && !skipBlueprintMerge && ptuEntry && liveEntry && chosen === liveEntry) {
    const ptuUrl = `${DATA_BASE}${ptuEntry.file}`;
    console.error(
      `Augmenting live blueprints from PTU ${ptuEntry.version} (${ptuUrl}) …`
    );
    const ptuData = await fetchJson(ptuUrl);
    const { poolsMerged, contractsAugmented } = augmentLiveWithPtuBlueprints(
      data,
      ptuData
    );
    meta.blueprintAugmentedFrom = ptuEntry.version;
    meta.blueprintPoolsMergedFromPtu = poolsMerged;
    meta.contractsBlueprintRewardsFromPtu = contractsAugmented;
    console.error(
      `Blueprint augmentation: ${poolsMerged} pool ids, ${contractsAugmented} contracts`
    );
  }

  const payload = { _meta: meta, ...data };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload), "utf8");

  const nC = data.contracts?.length ?? 0;
  const nL = data.legacyContracts?.length ?? 0;
  const bpCount = Object.keys(data.blueprintPools || {}).length;
  const withBr = (data.contracts || []).filter((c) => c.blueprintRewards?.length)
    .length;
  const bytes = fs.statSync(OUT_FILE).size;
  console.error(
    `Wrote ${OUT_FILE} (${(bytes / 1024 / 1024).toFixed(2)} MiB) — contracts ${nC} + legacy ${nL} = ${nC + nL}; blueprintPools ${bpCount}; contracts w/ blueprintRewards ${withBr}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
