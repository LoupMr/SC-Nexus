import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "sc-nexus.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer'
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ledger (
      id TEXT PRIMARY KEY,
      item_name TEXT NOT NULL,
      subcategory TEXT NOT NULL,
      owner TEXT NOT NULL,
      status TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      location TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ledger_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ledger_id TEXT NOT NULL REFERENCES ledger(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      username TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      timestamp TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS operations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      priority TEXT NOT NULL DEFAULT 'medium'
    );

    CREATE TABLE IF NOT EXISTS operation_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_id TEXT NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL,
      station TEXT NOT NULL,
      target TEXT NOT NULL,
      requirements TEXT NOT NULL,
      description TEXT NOT NULL,
      map_url TEXT
    );

    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS hangar_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS hangar_assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      ship_class TEXT NOT NULL DEFAULT '',
      requirement_tag TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS member_merits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      tag TEXT NOT NULL,
      operation_id TEXT NOT NULL,
      operation_name TEXT NOT NULL,
      awarded_by TEXT NOT NULL,
      awarded_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hangar_requests (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      asset_id TEXT NOT NULL REFERENCES hangar_assets(id) ON DELETE CASCADE,
      merit_id INTEGER REFERENCES member_merits(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      note TEXT NOT NULL DEFAULT '',
      requested_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS raffles (
      id TEXT PRIMARY KEY,
      merit_tag TEXT NOT NULL,
      asset_id TEXT REFERENCES hangar_assets(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'open',
      winner_username TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS raffle_prizes (
      id TEXT PRIMARY KEY,
      raffle_id TEXT NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
      asset_id TEXT NOT NULL REFERENCES hangar_assets(id) ON DELETE CASCADE,
      winner_username TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS guides (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      author_username TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      approved_by TEXT,
      approved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS blueprint_catalog (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contract_location TEXT NOT NULL DEFAULT '',
      farm_notes TEXT NOT NULL DEFAULT '',
      materials_json TEXT NOT NULL DEFAULT '[]',
      usage_notes TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS org_blueprints (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blueprint_id TEXT NOT NULL REFERENCES blueprint_catalog(id) ON DELETE CASCADE,
      unlocked_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, blueprint_id)
    );

    CREATE TABLE IF NOT EXISTS member_ship_hangar (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ship_slug TEXT NOT NULL,
      acquisition TEXT NOT NULL CHECK (acquisition IN ('pledge','ingame')),
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, ship_slug)
    );
  `);

  try { db.exec("ALTER TABLE operations ADD COLUMN merit_tag TEXT NOT NULL DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE users ADD COLUMN rank TEXT NOT NULL DEFAULT 'operator'"); } catch {}
  try { db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT"); } catch {}
  try { db.exec("ALTER TABLE users ADD COLUMN background_url TEXT"); } catch {}
  try { db.exec("ALTER TABLE hangar_requests ADD COLUMN merit_id INTEGER"); } catch {}
  try { db.exec("ALTER TABLE hangar_assets ADD COLUMN category_id TEXT"); } catch {}
  try { db.exec("ALTER TABLE hangar_assets ADD COLUMN requirement_count INTEGER NOT NULL DEFAULT 2"); } catch {}
  try { db.exec("ALTER TABLE hangar_assets ADD COLUMN unlock_callout TEXT"); } catch {}
  try {
    db.exec("ALTER TABLE ledger ADD COLUMN shared_with_org INTEGER NOT NULL DEFAULT 0");
    db.exec("UPDATE ledger SET shared_with_org = 1 WHERE shared_with_org = 0"); // backfill: legacy entries visible in org
  } catch {}
  try {
    db.exec("CREATE TABLE IF NOT EXISTS hangar_selections (id TEXT PRIMARY KEY, username TEXT NOT NULL, asset_id TEXT NOT NULL REFERENCES hangar_assets(id) ON DELETE CASCADE, selected_at TEXT DEFAULT (datetime('now')))");
  } catch {}
  try {
    db.exec("CREATE TABLE IF NOT EXISTS raffle_prizes (id TEXT PRIMARY KEY, raffle_id TEXT NOT NULL REFERENCES raffles(id) ON DELETE CASCADE, asset_id TEXT NOT NULL REFERENCES hangar_assets(id) ON DELETE CASCADE, winner_username TEXT, sort_order INTEGER NOT NULL DEFAULT 0)");
    const hasPrizes = db.prepare("SELECT 1 FROM raffle_prizes LIMIT 1").get();
    if (!hasPrizes) {
      const legacy = db.prepare("SELECT id, asset_id, winner_username FROM raffles WHERE asset_id IS NOT NULL AND asset_id != ''").all() as { id: string; asset_id: string; winner_username: string | null }[];
      const insert = db.prepare("INSERT INTO raffle_prizes (id, raffle_id, asset_id, winner_username, sort_order) VALUES (?, ?, ?, ?, 0)");
      for (const r of legacy) {
        try { insert.run(`prize-${r.id}-0`, r.id, r.asset_id, r.winner_username); } catch {}
      }
    }
  } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ledger_requests (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('add_to_org', 'take_from_org')),
        requester_username TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'pending_handoff', 'completed', 'declined')),
        resolved_by TEXT,
        resolved_at TEXT,
        reject_reason TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
  } catch {}
  try { db.exec("ALTER TABLE ledger_requests ADD COLUMN description TEXT"); } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ledger_request_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id TEXT NOT NULL REFERENCES ledger_requests(id) ON DELETE CASCADE,
        ledger_entry_id TEXT REFERENCES ledger(id) ON DELETE SET NULL,
        item_name TEXT,
        subcategory TEXT,
        quantity INTEGER NOT NULL,
        location TEXT,
        owner_confirmed_at TEXT,
        owner_confirmed_by TEXT
      )
    `);
  } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        type TEXT NOT NULL,
        request_id TEXT,
        message TEXT NOT NULL,
        read_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  } catch {}
  try {
    db.exec("CREATE TABLE IF NOT EXISTS hangar_categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0)");
    const catExists = db.prepare("SELECT id FROM hangar_categories LIMIT 1").get();
    if (!catExists) {
      db.prepare("INSERT INTO hangar_categories (id, name, description, sort_order) VALUES (?, ?, ?, ?)").run("cat-executive", "Executive Hangar", "Assets earned through ops participation", 0);
      db.prepare("UPDATE hangar_assets SET category_id = ? WHERE category_id IS NULL").run("cat-executive");
    }
  } catch {}

  const adminExists = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");
  if (!adminExists) {
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || "ChangeMe123!";
    if (process.env.NODE_ENV === "production" && (!process.env.ADMIN_INITIAL_PASSWORD || adminPassword === "ChangeMe123!")) {
      throw new Error(
        "In production, ADMIN_INITIAL_PASSWORD must be set to a secure value before first run. " +
        "Do not use the default 'ChangeMe123!'."
      );
    }
    const hash = bcrypt.hashSync(adminPassword, 10);
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run("admin", hash, "admin");
  }

  const passkeyExists = db.prepare("SELECT value FROM config WHERE key = ?").get("passkey");
  if (!passkeyExists) {
    db.prepare("INSERT INTO config (key, value) VALUES (?, ?)").run("passkey", generatePasskey());
  }

  const opsExist = db.prepare("SELECT id FROM operations LIMIT 1").get();
  if (!opsExist) {
    seedContestedZone(db);
  }

  const linksExist = db.prepare("SELECT id FROM links LIMIT 1").get();
  if (!linksExist) {
    seedLinks(db);
  }

  const blueprintRows = db.prepare("SELECT id FROM blueprint_catalog LIMIT 1").get();
  if (!blueprintRows) {
    seedBlueprintCatalog(db);
  }

  const apolloHangar = db.prepare("SELECT id FROM hangar_assets WHERE id = ?").get("hangar-apollo-triage");
  if (!apolloHangar) {
    seedApolloTriageHangar(db);
  }

  const g47 = db.prepare("SELECT id FROM guides WHERE id = ?").get("guide-alpha47-keeger");
  if (!g47) {
    seedGuidesAlpha47(db);
  }

  const op47 = db.prepare("SELECT id FROM operations WHERE id = ?").get("industry-47-qb");
  if (!op47) {
    seedIndustry47Operations(db);
  }
}

function seedLinks(db: Database.Database) {
  const defaults = [
    { id: "link-uif", title: "Star Citizen Database", description: "Universal Item Finder", url: "https://finder.cstone.space/", order: 0 },
    { id: "link-resource", title: "Star Citizen Resource Hub", description: "Star Citizen Links", url: "https://start.me/p/bpLle8/star-citizen-links", order: 1 },
    { id: "link-wikelo", title: "Wikelo Guide Sheet", description: "ChrisGBG's Star Citizen Reference Sheets", url: "https://docs.google.com/spreadsheets/d/1ji0q_pp6iW35RG1YyFEsv-lsmZOaCStJXGdIEdLLwhM/edit?gid=481073732#gid=481073732", order: 2 },
  ];
  const insert = db.prepare("INSERT INTO links (id, title, description, url, sort_order) VALUES (?, ?, ?, ?, ?)");
  for (const l of defaults) {
    insert.run(l.id, l.title, l.description, l.url, l.order);
  }
}

function seedBlueprintCatalog(db: Database.Database) {
  const rows: {
    id: string;
    name: string;
    contract_location: string;
    farm_notes: string;
    materials: string[];
    usage_notes: string;
    sort_order: number;
  }[] = [
    {
      id: "bp-qv-breaker-industrial",
      name: "QV Breaker — Industrial frame (example)",
      contract_location: "Keeger Belt — QV Breaker contract board",
      farm_notes: "Complete Exclusive or Shared mining-rights contracts; check SCMDB / in-game contract list for 4.7 rotation.",
      materials: ["RMC-graded industrial alloys", "Contract tokens", "Refinery output per SCCrafter recipe"],
      usage_notes: "Use at applicable industry fabricator; pair with org Ledger for output tracking.",
      sort_order: 0,
    },
    {
      id: "bp-nyx-pss-resupply",
      name: "People's Service Station — resupply kit blueprint",
      contract_location: "Nyx — People's Service Stations (verified safe haven)",
      farm_notes: "Faction / service missions around PSS; cross-check MMOpixel patch notes for 4.7.",
      materials: ["Medical supplies", "Fuel catalysts", "Light munitions crates"],
      usage_notes: "Supports restock / rearm / refuel logistics runs documented in the Nyx guide.",
      sort_order: 1,
    },
    {
      id: "bp-inventory-rework-util",
      name: "Marine logistics — stack & proximity loadout utility",
      contract_location: "Stanton / Pyro — military supply contracts",
      farm_notes: "Tied to Inventory Rework 4.7; monitor Reddit SC & CIG patch notes for live sources.",
      materials: ["Personal armor components", "FPS weapon maintenance kits"],
      usage_notes: "Reference combat protocol guide: proximity looting and stack-all change post-firefight SOP.",
      sort_order: 2,
    },
  ];
  const ins = db.prepare(
    "INSERT INTO blueprint_catalog (id, name, contract_location, farm_notes, materials_json, usage_notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  for (const r of rows) {
    ins.run(
      r.id,
      r.name,
      r.contract_location,
      r.farm_notes,
      JSON.stringify(r.materials),
      r.usage_notes,
      r.sort_order
    );
  }
}

function seedApolloTriageHangar(db: Database.Database) {
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM hangar_assets").get() as { next: number };
  db.prepare(
    "INSERT INTO hangar_assets (id, name, description, ship_class, requirement_tag, requirement_count, sort_order, category_id, unlock_callout) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    "hangar-apollo-triage",
    "RSI Apollo Triage",
    "Medical variant of the Apollo platform. Fleet registry entry for org rewards and merit unlocks.",
    "Medium",
    "medical-ops",
    2,
    maxOrder.next,
    "cat-executive",
    "Unlock: complete Wikelo contract chain (see Useful Links — Wikelo sheet)."
  );
}

function seedGuidesAlpha47(db: Database.Database) {
  const now = new Date().toISOString();
  const rows: { id: string; title: string; excerpt: string; content: string }[] = [
    {
      id: "guide-alpha47-keeger",
      title: "Keeger Belt — QV Breaker stations",
      excerpt: "Exclusive vs shared mining rights at QV Breakers; how contracts affect timelines.",
      content: `<h2>Overview</h2><p>Keeger Belt operations revolve around <strong>QV Breaker</strong> stations and the contract boards that gate mining rights.</p><h2>Exclusive vs shared</h2><p><strong>Exclusive</strong> mining rights contracts give your org a dedicated window: fewer competing miners on the same node cadence, but higher contract cost and failure penalties.</p><p><strong>Shared</strong> rights mean multiple operators can legally extract in the same band; expect more traffic and faster node depletion — plan escort and QRF accordingly.</p><h2>Tactical notes</h2><ul><li>Pre-assign salvage and security roles before accepting high-value exclusive tickets.</li><li>Shared rights favour fast prospector cycles and mobile refinery cover.</li><li>Cross-check in-game contract text each patch — CIG adjusts payouts frequently.</li></ul>`,
    },
    {
      id: "guide-alpha47-nyx",
      title: "Nyx — People's Service Stations",
      excerpt: "PSS as verified safe havens for restock, rearm, and refuel.",
      content: `<h2>People's Service Stations</h2><p>People's Service Stations (PSS) in Nyx are documented <strong>safe havens</strong> for logistics: restock, rearm, and refuel between deep-space transits.</p><h2>Usage</h2><ul><li>Route tankers and cargo through PSS when Pyro or fringe ops leave you low on hydrogen or munitions.</li><li>Keep comms discipline — treat PSS as public hubs, not covert rally points.</li></ul><h2>Intel</h2><p>Verify pad availability and armistice rules each session; update this guide after major patches.</p>`,
    },
    {
      id: "guide-alpha47-inventory",
      title: "Combat protocol — Inventory rework (4.7)",
      excerpt: "Proximity looting and stack-all: post-firefight timelines for marines.",
      content: `<h2>Inventory rework</h2><p>Patch <strong>4.7</strong> changes how squads recover gear after CQC: <strong>proximity looting</strong> and <strong>stack all</strong> compress the loot phase but raise coordination requirements.</p><h2>Proximity looting</h2><p>Operators can pull from nearby casualties or stashes without full body interaction — <strong>shorten security perimeter time</strong> but increase friendly-fire risk on shared piles. Assign a single loot boss per room.</p><h2>Stack all</h2><p>Bulk consolidation speeds evac — use it <em>after</em> medevac and ID check. Doctrine: security sweep → medic clear → stack-all under overwatch.</p><h2>Timeline</h2><p>Expect <strong>30–60 seconds faster</strong> room clears versus legacy looting; adjust bounding overwatch and ship spool times accordingly.</p>`,
    },
  ];
  const ins = db.prepare(
    "INSERT INTO guides (id, title, content, excerpt, author_username, status, approved_by, approved_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'admin', 'approved', 'admin', ?, ?, ?)"
  );
  for (const r of rows) {
    ins.run(r.id, r.title, r.content, r.excerpt, now, now, now);
  }
}

function seedIndustry47Operations(db: Database.Database) {
  const opId = "industry-47-qb";
  db.prepare("INSERT INTO operations (id, title, description, status, priority, merit_tag) VALUES (?, ?, ?, ?, ?, ?)").run(
    opId,
    "Industry 4.7 — QV Breakers & Nyx lines",
    "Secure QV Breaker mining infrastructure and maintain jump-point control near People's Service Stations for org logistics.",
    "active",
    "high",
    "industry-47"
  );
  const steps = [
    {
      order: 1,
      station: "Keeger Belt",
      target: "QV Breaker primary",
      requirements: "Mining / security division",
      description: "Establish presence at assigned QV Breaker. Validate contract type (exclusive vs shared) and set ROE for neutral miners.",
      map: null as string | null,
    },
    {
      order: 2,
      station: "Keeger Belt",
      target: "Breaker board control",
      requirements: "Logistics uplink",
      description: "Monitor contract rotation; relay exclusive-window timing to fleet C2.",
      map: null,
    },
    {
      order: 3,
      station: "Nyx",
      target: "PSS approach lanes",
      requirements: "CAP / escort",
      description: "Hold jump-point approaches to People's Service Stations; prioritize tanker and medevac traffic.",
      map: null,
    },
    {
      order: 4,
      station: "Nyx",
      target: "Restock integrity",
      requirements: "Quartermaster",
      description: "Confirm rearm / refuel stock at PSS before long pushes into lawless space.",
      map: null,
    },
  ];
  const insert = db.prepare(
    "INSERT INTO operation_steps (operation_id, step_order, station, target, requirements, description, map_url) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  for (const s of steps) {
    insert.run(opId, s.order, s.station, s.target, s.requirements, s.description, s.map);
  }
}

function seedContestedZone(db: Database.Database) {
  const opId = "cz-pyro";
  db.prepare("INSERT INTO operations (id, title, description, status, priority) VALUES (?, ?, ?, ?, ?)").run(
    opId,
    "Pyro Contested Zone",
    "Complete guide to all objectives across Pyro stations — keycards, boards, and The Vault",
    "active",
    "high"
  );

  const steps = [
    { order: 1, station: "PYAM-SUPVISR-3-4", target: "PYAM Supervisor Keycard", requirements: "1x Fuse", description: "Located behind a fuse door, look for the Green cross", map: null },
    { order: 2, station: "PYAM-SUPVISR-3-5", target: "PYAM Supervisor Keycard", requirements: "1x Fuse", description: "Located behind a fuse door, look for the Green cross", map: null },
    { order: 3, station: "Checkmate", target: "Board 1", requirements: "1x Fuse + 1x Red Door", description: "Located behind a fuse door and a red door.", map: "https://imgur.com/a/0X1vUdk" },
    { order: 4, station: "Checkmate", target: "Boards 2 & 3", requirements: "Option A: 1x Fuse -> 1x Red -> 1x Blue\nOption B: 2x Fuse -> 2x Blue", description: "Located in the hangar. Accessible via two entrances: one with a Fuse/Red/Blue combo, the other with two Fuses and two Blue doors.", map: "https://imgur.com/a/0X1vUdk" },
    { order: 5, station: "Orbituary", target: "Board 4", requirements: "1x Fuse -> 1x Red -> 1x Fuse", description: "Located behind a fuse door, a red door, and a second fuse door.", map: "https://imgur.com/a/unXKnMx" },
    { order: 6, station: "Orbituary", target: "Board 7", requirements: "1x Fuse -> 1x Red -> 1x Fuse -> 2x Blue", description: "Located in the hangar, behind a sequence of a fuse door, red door, another fuse door, and then two blue doors.", map: "https://imgur.com/a/unXKnMx" },
    { order: 7, station: "Ruin", target: "Ghost Arena", requirements: "(Nexus/Main Entrance)", description: "A nexus and main entrance that leads to The Crypt, Wasteland, Last Resort, and The Vault.", map: "https://imgur.com/a/NuO6MSt" },
    { order: 8, station: "Ruin", target: "The Crypt", requirements: "Exploration", description: "Provides access to The Crypt Keycard. This keycard is required to gain access to Board 5 within The Vault.", map: "https://imgur.com/a/NuO6MSt" },
    { order: 9, station: "Ruin", target: "Wasteland", requirements: "Exploration", description: "Provides access to the Wasteland Keycard.", map: "https://imgur.com/a/NuO6MSt" },
    { order: 10, station: "Ruin", target: "Last Resort", requirements: "Exploration", description: "Provides access to the Last Resort Keycard.", map: "https://imgur.com/a/NuO6MSt" },
    { order: 11, station: "Ruin", target: "The Vault", requirements: "20-Min Timer", description: "Door opens every 20 mins and closes after 1 min. Contains Boards 5 and 6.", map: "https://imgur.com/a/NuO6MSt" },
    { order: 12, station: "Ruin", target: "Board 6", requirements: "Timer Access", description: "Located in the vault above the entry floor in the second room after the main Vault door.", map: "https://imgur.com/a/NuO6MSt" },
    { order: 13, station: "Ruin", target: "Board 5", requirements: "1x Crypt Keycard", description: "Located in the vault behind yet another door in the second room. Card found in The Crypt.", map: "https://imgur.com/a/NuO6MSt" },
  ];

  const insert = db.prepare("INSERT INTO operation_steps (operation_id, step_order, station, target, requirements, description, map_url) VALUES (?, ?, ?, ?, ?, ?, ?)");
  for (const s of steps) {
    insert.run(opId, s.order, s.station, s.target, s.requirements, s.description, s.map);
  }
}

// --- Password hashing ---

const BCRYPT_ROUNDS = 10;

/** Check if a stored hash is legacy (simpleHash format). Legacy hashes don't start with $2. */
function isLegacyHash(hash: string): boolean {
  return !hash.startsWith("$2");
}

/** Legacy hash for migration only. Do not use for new passwords. */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + str.length.toString(36);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, storedHash: string, userId?: number): Promise<boolean> {
  if (isLegacyHash(storedHash)) {
    const match = storedHash === simpleHash(password);
    if (match && userId) {
      const newHash = await hashPassword(password);
      getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, userId);
    }
    return match;
  }
  return bcrypt.compare(password, storedHash);
}

export function updatePasswordHash(userId: number, newHash: string) {
  getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, userId);
}

function generatePasskey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "";
  for (let i = 0; i < 8; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key.slice(0, 4) + "-" + key.slice(4);
}

// --- Auth ---

interface DbUser {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  avatar_url?: string | null;
}

export function findUserByUsername(username: string): DbUser | undefined {
  return getDb().prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?)").get(username) as DbUser | undefined;
}

export function createUser(username: string, passwordHash: string, role: string = "viewer") {
  getDb().prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run(username, passwordHash, role);
  return findUserByUsername(username)!;
}

export function getAllUsers(): { username: string; role: string; roles: string[]; rank: string; avatarUrl: string | null }[] {
  const rows = getDb().prepare("SELECT username, role, COALESCE(rank, 'operator') as rank, avatar_url FROM users ORDER BY id").all() as { username: string; role: string; rank: string; avatar_url: string | null }[];
  return rows.map((r) => {
    const roles = (r.role || "viewer").split(",").map((s) => s.trim()).filter(Boolean);
    return { username: r.username, role: r.role, rank: r.rank, avatarUrl: r.avatar_url ?? null, roles: roles.length ? roles : ["viewer"] };
  });
}

export function getRoster(): { username: string; rank: string; avatarUrl: string | null }[] {
  const rows = getDb().prepare("SELECT username, COALESCE(rank, 'operator') as rank, avatar_url FROM users ORDER BY id").all() as { username: string; rank: string; avatar_url: string | null }[];
  return rows.filter((r) => r.rank !== "none").map((r) => ({ username: r.username, rank: r.rank, avatarUrl: r.avatar_url ?? null }));
}

export function updateUserRole(username: string, role: string) {
  getDb().prepare("UPDATE users SET role = ? WHERE LOWER(username) = LOWER(?)").run(role, username);
}

export function updateUserRoles(username: string, roles: string[]) {
  const value = roles.length ? roles.join(",") : "viewer";
  getDb().prepare("UPDATE users SET role = ? WHERE LOWER(username) = LOWER(?)").run(value, username);
}

export function updateUserRank(username: string, rank: string) {
  getDb().prepare("UPDATE users SET rank = ? WHERE LOWER(username) = LOWER(?)").run(rank, username);
}

export function getAvatarUrl(username: string): string | null {
  const row = getDb().prepare("SELECT avatar_url FROM users WHERE LOWER(username) = LOWER(?)").get(username) as { avatar_url: string | null } | undefined;
  return row?.avatar_url ?? null;
}

export function getAvatarUrls(usernames: string[]): Record<string, string | null> {
  const unique = [...new Set(usernames.map((u) => u.toLowerCase()).filter(Boolean))];
  const result: Record<string, string | null> = {};
  for (const u of usernames) result[u] = null;
  if (unique.length === 0) return result;
  const rows = getDb().prepare("SELECT username, avatar_url FROM users WHERE LOWER(username) IN (" + unique.map(() => "?").join(",") + ")").all(...unique) as { username: string; avatar_url: string | null }[];
  const byLower = new Map<string, string | null>();
  for (const r of rows) byLower.set(r.username.toLowerCase(), r.avatar_url ?? null);
  for (const u of usernames) result[u] = byLower.get(u.toLowerCase()) ?? null;
  return result;
}

export function updateUserAvatar(username: string, avatarUrl: string | null): boolean {
  const result = getDb().prepare("UPDATE users SET avatar_url = ? WHERE LOWER(username) = LOWER(?)").run(avatarUrl ?? null, username);
  return result.changes > 0;
}

export function updateUserBackground(username: string, backgroundUrl: string | null): boolean {
  const result = getDb().prepare("UPDATE users SET background_url = ? WHERE LOWER(username) = LOWER(?)").run(backgroundUrl ?? null, username);
  return result.changes > 0;
}

export function deleteUser(username: string) {
  const user = findUserByUsername(username);
  if (user) {
    getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
    getDb().prepare("DELETE FROM users WHERE id = ?").run(user.id);
  }
}

// --- Sessions ---

export function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString("hex");
  getDb().prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, userId);
  return token;
}

export function getUserBySession(token: string): { id: number; username: string; role: string; roles: string[]; rank: string; avatarUrl: string | null; backgroundUrl: string | null } | undefined {
  const row = getDb().prepare(`
    SELECT u.id, u.username, u.role, COALESCE(u.rank, 'operator') as rank, u.avatar_url, u.background_url FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
  `).get(token) as { id: number; username: string; role: string; rank: string; avatar_url: string | null; background_url: string | null } | undefined;
  if (!row) return undefined;
  const roles = (row.role || "viewer").split(",").map((s) => s.trim()).filter(Boolean);
  return { ...row, avatarUrl: row.avatar_url ?? null, backgroundUrl: row.background_url ?? null, roles: roles.length ? roles : ["viewer"] };
}

export function deleteSession(token: string) {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

// --- Passkey ---

export function getPasskey(): string {
  const row = getDb().prepare("SELECT value FROM config WHERE key = ?").get("passkey") as { value: string } | undefined;
  return row?.value || "";
}

export function regeneratePasskeyDb(): string {
  const key = generatePasskey();
  getDb().prepare("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)").run("passkey", key);
  return key;
}

// --- Audit Log ---

export function logAudit(action: string, actor: string, targetType?: string, targetId?: string, details?: string) {
  getDb().prepare(
    "INSERT INTO audit_log (action, actor, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)"
  ).run(action, actor, targetType ?? null, targetId ?? null, details ?? null);
}

export function getAuditLog(limit = 100): { id: number; action: string; actor: string; targetType: string | null; targetId: string | null; details: string | null; createdAt: string }[] {
  const rows = getDb().prepare(
    "SELECT id, action, actor, target_type as targetType, target_id as targetId, details, created_at as createdAt FROM audit_log ORDER BY id DESC LIMIT ?"
  ).all(limit) as { id: number; action: string; actor: string; targetType: string | null; targetId: string | null; details: string | null; createdAt: string }[];
  return rows;
}

// --- Ledger ---

interface DbLedgerRow {
  id: string;
  item_name: string;
  subcategory: string;
  owner: string;
  status: string;
  quantity: number;
  location: string;
  shared_with_org?: number;
}

export interface LedgerEntryWithHistory {
  id: string;
  itemName: string;
  subcategory: string;
  owner: string;
  status: string;
  quantity: number;
  location: string;
  sharedWithOrg: boolean;
  history: { action: string; user: string; timestamp: string; quantity: number }[];
}

function deriveStatus(qty: number): string {
  if (qty <= 0) return "Depleted";
  if (qty <= 3) return "Low Stock";
  return "Available";
}

type HistoryRow = { ledger_id: string; action: string; username: string; quantity: number; timestamp: string };

function mapLedgerRowWithHistory(row: DbLedgerRow, history: HistoryRow[]): LedgerEntryWithHistory {
  const entryHistory = history
    .filter((h) => h.ledger_id === row.id)
    .map((h) => ({ action: h.action, user: h.username, timestamp: h.timestamp, quantity: h.quantity }));
  return {
    id: row.id,
    itemName: row.item_name,
    subcategory: row.subcategory,
    owner: row.owner,
    status: row.status,
    quantity: row.quantity,
    location: row.location,
    sharedWithOrg: !!(row.shared_with_org ?? 0),
    history: entryHistory,
  };
}

function mapLedgerRow(db: Database.Database, row: DbLedgerRow): LedgerEntryWithHistory {
  const history = db.prepare(
    "SELECT ledger_id, action, username, quantity, timestamp FROM ledger_history WHERE ledger_id = ? ORDER BY id"
  ).all(row.id) as HistoryRow[];
  return mapLedgerRowWithHistory(row, history);
}

export function getAllLedgerEntries(): LedgerEntryWithHistory[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM ledger ORDER BY rowid").all() as DbLedgerRow[];
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(",");
  const allHistory = db.prepare(
    `SELECT ledger_id, action, username, quantity, timestamp FROM ledger_history WHERE ledger_id IN (${placeholders}) ORDER BY ledger_id, id`
  ).all(...ids) as HistoryRow[];
  return rows.map((row) => mapLedgerRowWithHistory(row, allHistory));
}

export function getLedgerEntriesForView(view: "org" | "mine", username: string): LedgerEntryWithHistory[] {
  const db = getDb();
  let rows: DbLedgerRow[];
  if (view === "org") {
    rows = db.prepare("SELECT * FROM ledger WHERE shared_with_org = 1 ORDER BY rowid").all() as DbLedgerRow[];
  } else {
    rows = db.prepare("SELECT * FROM ledger WHERE owner = ? ORDER BY rowid").all(username) as DbLedgerRow[];
  }
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(",");
  const allHistory = db.prepare(
    `SELECT ledger_id, action, username, quantity, timestamp FROM ledger_history WHERE ledger_id IN (${placeholders}) ORDER BY ledger_id, id`
  ).all(...ids) as HistoryRow[];
  return rows.map((row) => mapLedgerRowWithHistory(row, allHistory));
}

export function getLedgerEntryById(id: string): LedgerEntryWithHistory | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM ledger WHERE id = ?").get(id) as DbLedgerRow | undefined;
  if (!row) return null;
  return mapLedgerRow(db, row);
}

export function addLedgerEntry(itemName: string, subcategory: string, owner: string, quantity: number, location: string, sharedWithOrg = false): LedgerEntryWithHistory {
  const db = getDb();
  const shared = sharedWithOrg ? 1 : 0;

  const existing = db.prepare(
    "SELECT * FROM ledger WHERE LOWER(item_name) = LOWER(?) AND LOWER(location) = LOWER(?) AND owner = ?"
  ).get(itemName, location, owner) as DbLedgerRow | undefined;

  if (existing) {
    const newQty = existing.quantity + quantity;
    const newStatus = deriveStatus(newQty);
    db.prepare("UPDATE ledger SET quantity = ?, status = ?, shared_with_org = ? WHERE id = ?").run(newQty, newStatus, shared, existing.id);
    db.prepare("INSERT INTO ledger_history (ledger_id, action, username, quantity) VALUES (?, ?, ?, ?)").run(
      existing.id, "added", owner, quantity
    );
    return getLedgerEntryById(existing.id)!;
  }

  const id = `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const status = deriveStatus(quantity);
  db.prepare("INSERT INTO ledger (id, item_name, subcategory, owner, status, quantity, location, shared_with_org) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
    id, itemName, subcategory, owner, status, quantity, location, shared
  );
  db.prepare("INSERT INTO ledger_history (ledger_id, action, username, quantity) VALUES (?, ?, ?, ?)").run(
    id, "added", owner, quantity
  );
  return getLedgerEntryById(id)!;
}

export function takeLedgerItem(entryId: string, username: string, quantity: number): LedgerEntryWithHistory | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM ledger WHERE id = ?").get(entryId) as DbLedgerRow | undefined;
  if (!row) return null;
  const newQty = Math.max(0, row.quantity - quantity);
  const newStatus = deriveStatus(newQty);
  db.prepare("UPDATE ledger SET quantity = ?, status = ? WHERE id = ?").run(newQty, newStatus, entryId);
  db.prepare("INSERT INTO ledger_history (ledger_id, action, username, quantity) VALUES (?, ?, ?, ?)").run(
    entryId, "taken", username, quantity
  );
  return getLedgerEntryById(entryId);
}

export function deleteLedgerEntry(entryId: string): boolean {
  const result = getDb().prepare("DELETE FROM ledger WHERE id = ?").run(entryId);
  return result.changes > 0;
}

export function setLedgerEntryShared(entryId: string, sharedWithOrg: boolean): LedgerEntryWithHistory | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM ledger WHERE id = ?").get(entryId) as DbLedgerRow | undefined;
  if (!row) return null;
  db.prepare("UPDATE ledger SET shared_with_org = ? WHERE id = ?").run(sharedWithOrg ? 1 : 0, entryId);
  return getLedgerEntryById(entryId);
}

// --- Ledger Requests ---

export type LedgerRequestType = "add_to_org" | "take_from_org";
export type LedgerRequestStatus = "pending" | "approved" | "rejected" | "pending_handoff" | "completed" | "declined";

export interface LedgerRequestItem {
  id: number;
  requestId: string;
  ledgerEntryId: string | null;
  itemName: string | null;
  subcategory: string | null;
  quantity: number;
  location: string | null;
  ownerConfirmedAt: string | null;
  ownerConfirmedBy: string | null;
}

export interface LedgerRequest {
  id: string;
  type: LedgerRequestType;
  requesterUsername: string;
  status: LedgerRequestStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  rejectReason: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  items: LedgerRequestItem[];
}

type RequestDbRow = { id: string; type: string; requester_username: string; status: string; resolved_by: string | null; resolved_at: string | null; reject_reason: string | null; description?: string | null; created_at: string; updated_at: string };
type ItemDbRow = { id: number; request_id: string; ledger_entry_id: string | null; item_name: string | null; subcategory: string | null; quantity: number; location: string | null; owner_confirmed_at: string | null; owner_confirmed_by: string | null };

function mapRequestRowWithItems(row: RequestDbRow, itemsByRequest: Map<string, ItemDbRow[]>): LedgerRequest {
  const items = (itemsByRequest.get(row.id) ?? []).map((i) => ({
    id: i.id,
    requestId: i.request_id,
    ledgerEntryId: i.ledger_entry_id,
    itemName: i.item_name,
    subcategory: i.subcategory,
    quantity: i.quantity,
    location: i.location,
    ownerConfirmedAt: i.owner_confirmed_at,
    ownerConfirmedBy: i.owner_confirmed_by,
  }));
  return {
    id: row.id,
    type: row.type as LedgerRequestType,
    requesterUsername: row.requester_username,
    status: row.status as LedgerRequestStatus,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    rejectReason: row.reject_reason,
    description: row.description ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  };
}

function mapRequestRow(db: Database.Database, row: RequestDbRow): LedgerRequest {
  const items = db.prepare(
    "SELECT id, request_id, ledger_entry_id, item_name, subcategory, quantity, location, owner_confirmed_at, owner_confirmed_by FROM ledger_request_items WHERE request_id = ? ORDER BY id"
  ).all(row.id) as ItemDbRow[];
  return mapRequestRowWithItems(row, new Map([[row.id, items]]));
}

export function createLedgerRequest(
  type: LedgerRequestType,
  requesterUsername: string,
  items: { ledgerEntryId?: string; itemName?: string; subcategory?: string; quantity: number; location?: string }[],
  description?: string | null
): LedgerRequest {
  const db = getDb();
  const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(
    "INSERT INTO ledger_requests (id, type, requester_username, status, description) VALUES (?, ?, ?, 'pending', ?)"
  ).run(id, type, requesterUsername, description ?? null);

  const insertItem = db.prepare(
    "INSERT INTO ledger_request_items (request_id, ledger_entry_id, item_name, subcategory, quantity, location) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const it of items) {
    insertItem.run(id, it.ledgerEntryId ?? null, it.itemName ?? null, it.subcategory ?? null, it.quantity, it.location ?? null);
  }

  const row = db.prepare("SELECT * FROM ledger_requests WHERE id = ?").get(id) as { id: string; type: string; requester_username: string; status: string; resolved_by: string | null; resolved_at: string | null; reject_reason: string | null; description: string | null; created_at: string; updated_at: string };
  return mapRequestRow(db, row);
}

function batchFetchRequestItems(db: Database.Database, requestIds: string[]): Map<string, ItemDbRow[]> {
  const map = new Map<string, ItemDbRow[]>();
  if (requestIds.length === 0) return map;
  const placeholders = requestIds.map(() => "?").join(",");
  const items = db.prepare(
    `SELECT id, request_id, ledger_entry_id, item_name, subcategory, quantity, location, owner_confirmed_at, owner_confirmed_by FROM ledger_request_items WHERE request_id IN (${placeholders}) ORDER BY request_id, id`
  ).all(...requestIds) as ItemDbRow[];
  for (const i of items) {
    const list = map.get(i.request_id) ?? [];
    list.push(i);
    map.set(i.request_id, list);
  }
  return map;
}

export function getLedgerRequestsForUser(username: string): LedgerRequest[] {
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM ledger_requests WHERE requester_username = ? ORDER BY created_at DESC"
  ).all(username) as RequestDbRow[];
  const itemsByRequest = batchFetchRequestItems(db, rows.map((r) => r.id));
  return rows.map((r) => mapRequestRowWithItems(r, itemsByRequest));
}

export function getLedgerRequestsForLogistics(): LedgerRequest[] {
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM ledger_requests WHERE status = 'pending' AND type IN ('add_to_org', 'take_from_org') ORDER BY created_at ASC"
  ).all() as RequestDbRow[];
  const itemsByRequest = batchFetchRequestItems(db, rows.map((r) => r.id));
  return rows.map((r) => mapRequestRowWithItems(r, itemsByRequest));
}

export function getLedgerRequestsForOwner(ownerUsername: string): LedgerRequest[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT DISTINCT r.* FROM ledger_requests r
    JOIN ledger_request_items i ON i.request_id = r.id
    JOIN ledger l ON l.id = i.ledger_entry_id AND l.owner = ?
    WHERE r.status = 'pending_handoff' AND i.owner_confirmed_at IS NULL
    ORDER BY r.created_at ASC
  `).all(ownerUsername) as RequestDbRow[];
  const itemsByRequest = batchFetchRequestItems(db, rows.map((r) => r.id));
  return rows.map((r) => mapRequestRowWithItems(r, itemsByRequest));
}

export function getLedgerRequestById(id: string): LedgerRequest | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM ledger_requests WHERE id = ?").get(id) as { id: string; type: string; requester_username: string; status: string; resolved_by: string | null; resolved_at: string | null; reject_reason: string | null; description?: string | null; created_at: string; updated_at: string } | undefined;
  if (!row) return null;
  return mapRequestRow(db, row);
}

export function approveLedgerRequest(id: string, resolvedBy: string): LedgerRequest | null {
  const db = getDb();
  const req = getLedgerRequestById(id);
  if (!req || req.status !== "pending") return null;

  const now = new Date().toISOString();
  if (req.type === "add_to_org") {
    for (const it of req.items) {
      if (it.itemName && it.subcategory && it.location) {
        addLedgerEntry(it.itemName, it.subcategory, req.requesterUsername, it.quantity, it.location, true);
      }
    }
    db.prepare("UPDATE ledger_requests SET status = 'approved', resolved_by = ?, resolved_at = ?, updated_at = ? WHERE id = ?").run(resolvedBy, now, now, id);
    createNotification(req.requesterUsername, "add_request_approved", id, "Your request to add to org ledger was approved.");
  } else {
    db.prepare("UPDATE ledger_requests SET status = 'pending_handoff', resolved_by = ?, resolved_at = ?, updated_at = ? WHERE id = ?").run(resolvedBy, now, now, id);
    const ownerItems: Record<string, { itemName: string; qty: number }[]> = {};
    for (const it of req.items) {
      if (it.ledgerEntryId) {
        const entry = getLedgerEntryById(it.ledgerEntryId);
        if (entry) {
          if (!ownerItems[entry.owner]) ownerItems[entry.owner] = [];
          ownerItems[entry.owner].push({ itemName: entry.itemName, qty: it.quantity });
        }
      }
    }
    for (const [owner, items] of Object.entries(ownerItems)) {
      const summary = items.map((i) => `${i.qty}x ${i.itemName}`).join(", ");
      createNotification(owner, "take_request_approved", id, `${req.requesterUsername} wants to take ${summary}. Hand off and confirm.`);
    }
  }
  return getLedgerRequestById(id);
}

export function rejectLedgerRequest(id: string, resolvedBy: string, reason?: string): LedgerRequest | null {
  const db = getDb();
  const req = getLedgerRequestById(id);
  if (!req || req.status !== "pending") return null;

  const now = new Date().toISOString();
  db.prepare("UPDATE ledger_requests SET status = 'rejected', resolved_by = ?, resolved_at = ?, reject_reason = ?, updated_at = ? WHERE id = ?").run(resolvedBy, now, reason ?? null, now, id);
  createNotification(req.requesterUsername, "request_rejected", id, `Your request was rejected.${reason ? ` Reason: ${reason}` : ""}`);
  return getLedgerRequestById(id);
}

export function confirmLedgerRequestHandoff(id: string, ownerUsername: string): LedgerRequest | null {
  const db = getDb();
  const req = getLedgerRequestById(id);
  if (!req || req.type !== "take_from_org" || req.status !== "pending_handoff") return null;

  const items = req.items.filter((i) => i.ledgerEntryId);
  const entryIds = [...new Set(items.map((i) => i.ledgerEntryId!))];
  for (const eid of entryIds) {
    const entry = getLedgerEntryById(eid);
    if (!entry || entry.owner !== ownerUsername) continue;
    const forThisEntry = items.filter((i) => i.ledgerEntryId === eid);
    const totalQty = forThisEntry.reduce((s, i) => s + i.quantity, 0);
    takeLedgerItem(eid, req.requesterUsername, totalQty);
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE ledger_request_items SET owner_confirmed_at = ?, owner_confirmed_by = ? WHERE request_id = ? AND ledger_entry_id IN (SELECT id FROM ledger WHERE owner = ?)").run(now, ownerUsername, id, ownerUsername);

  const allConfirmed = db.prepare("SELECT COUNT(*) as c FROM ledger_request_items WHERE request_id = ? AND ledger_entry_id IS NOT NULL AND owner_confirmed_at IS NULL").get(id) as { c: number };
  if (allConfirmed.c === 0) {
    db.prepare("UPDATE ledger_requests SET status = 'completed', updated_at = ? WHERE id = ?").run(now, id);
    createNotification(req.requesterUsername, "take_request_completed", id, "Your take request has been fulfilled.");
  }

  return getLedgerRequestById(id);
}

export function declineLedgerRequestHandoff(id: string, ownerUsername: string, reason?: string): LedgerRequest | null {
  const db = getDb();
  const req = getLedgerRequestById(id);
  if (!req || req.type !== "take_from_org" || req.status !== "pending_handoff") return null;

  const now = new Date().toISOString();
  db.prepare("UPDATE ledger_requests SET status = 'declined', resolved_by = ?, reject_reason = ?, updated_at = ? WHERE id = ?").run(ownerUsername, reason ?? null, now, id);
  createNotification(req.requesterUsername, "take_request_declined", id, `The owner declined.${reason ? ` Reason: ${reason}` : ""}`);
  return getLedgerRequestById(id);
}

export function createNotification(username: string, type: string, requestId: string | null, message: string): void {
  getDb().prepare("INSERT INTO notifications (username, type, request_id, message) VALUES (?, ?, ?, ?)").run(username, type, requestId, message);
}

export function getNotifications(username: string, unreadOnly = false): { id: number; type: string; requestId: string | null; message: string; readAt: string | null; createdAt: string }[] {
  const db = getDb();
  const sql = unreadOnly
    ? "SELECT id, type, request_id, message, read_at, created_at FROM notifications WHERE username = ? AND read_at IS NULL ORDER BY created_at DESC"
    : "SELECT id, type, request_id, message, read_at, created_at FROM notifications WHERE username = ? ORDER BY created_at DESC LIMIT 50";
  const rows = db.prepare(sql).all(username) as { id: number; type: string; request_id: string | null; message: string; read_at: string | null; created_at: string }[];
  return rows.map((r) => ({ id: r.id, type: r.type, requestId: r.request_id, message: r.message, readAt: r.read_at, createdAt: r.created_at }));
}

export function markNotificationRead(id: number): void {
  getDb().prepare("UPDATE notifications SET read_at = datetime('now') WHERE id = ?").run(id);
}

export function getUnreadNotificationCount(username: string): number {
  const row = getDb().prepare("SELECT COUNT(*) as c FROM notifications WHERE username = ? AND read_at IS NULL").get(username) as { c: number };
  return row.c;
}

// --- Operations ---

interface DbOpRow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  merit_tag: string;
}

interface DbStepRow {
  id: number;
  operation_id: string;
  step_order: number;
  station: string;
  target: string;
  requirements: string;
  description: string;
  map_url: string | null;
}

export interface OperationStep {
  id: number;
  order: number;
  station: string;
  target: string;
  requirements: string;
  description: string;
  mapUrl: string | null;
}

export interface OperationWithSteps {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  meritTag: string;
  steps: OperationStep[];
}

export function getAllOperations(): OperationWithSteps[] {
  const db = getDb();
  const ops = db.prepare("SELECT * FROM operations ORDER BY rowid").all() as DbOpRow[];
  return ops.map((op) => {
    const steps = db.prepare("SELECT * FROM operation_steps WHERE operation_id = ? ORDER BY step_order").all(op.id) as DbStepRow[];
    return {
      id: op.id,
      title: op.title,
      description: op.description,
      status: op.status,
      priority: op.priority,
      meritTag: op.merit_tag || "",
      steps: steps.map((s) => ({
        id: s.id,
        order: s.step_order,
        station: s.station,
        target: s.target,
        requirements: s.requirements,
        description: s.description,
        mapUrl: s.map_url,
      })),
    };
  });
}

export function createOperation(title: string, description: string, status: string, priority: string, meritTag: string, steps: Omit<OperationStep, "id">[]): OperationWithSteps {
  const db = getDb();
  const id = `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  db.prepare("INSERT INTO operations (id, title, description, status, priority, merit_tag) VALUES (?, ?, ?, ?, ?, ?)").run(id, title, description, status, priority, meritTag);
  const insert = db.prepare("INSERT INTO operation_steps (operation_id, step_order, station, target, requirements, description, map_url) VALUES (?, ?, ?, ?, ?, ?, ?)");
  for (const s of steps) {
    insert.run(id, s.order, s.station, s.target, s.requirements, s.description, s.mapUrl);
  }
  return getAllOperations().find((o) => o.id === id)!;
}

export function updateOperation(opId: string, title: string, description: string, status: string, priority: string, meritTag: string, steps: Omit<OperationStep, "id">[]): OperationWithSteps | null {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM operations WHERE id = ?").get(opId);
  if (!existing) return null;
  db.prepare("UPDATE operations SET title = ?, description = ?, status = ?, priority = ?, merit_tag = ? WHERE id = ?").run(title, description, status, priority, meritTag, opId);
  db.prepare("DELETE FROM operation_steps WHERE operation_id = ?").run(opId);
  const insert = db.prepare("INSERT INTO operation_steps (operation_id, step_order, station, target, requirements, description, map_url) VALUES (?, ?, ?, ?, ?, ?, ?)");
  for (const s of steps) {
    insert.run(opId, s.order, s.station, s.target, s.requirements, s.description, s.mapUrl);
  }
  return getAllOperations().find((o) => o.id === opId) || null;
}

export function deleteOperation(opId: string): boolean {
  const result = getDb().prepare("DELETE FROM operations WHERE id = ?").run(opId);
  return result.changes > 0;
}

export function updateOperationMeritTag(opId: string, meritTag: string): boolean {
  const result = getDb().prepare("UPDATE operations SET merit_tag = ? WHERE id = ?").run(meritTag, opId);
  return result.changes > 0;
}

// --- Links ---

export interface Link {
  id: string;
  title: string;
  description: string;
  url: string;
  sortOrder: number;
}

export function getAllLinks(): Link[] {
  const rows = getDb().prepare("SELECT id, title, description, url, sort_order as sortOrder FROM links ORDER BY sort_order, id").all() as Link[];
  return rows;
}

export function createLink(title: string, description: string, url: string): Link {
  const id = `link-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const maxOrder = getDb().prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM links").get() as { next: number };
  getDb().prepare("INSERT INTO links (id, title, description, url, sort_order) VALUES (?, ?, ?, ?, ?)").run(id, title, description, url, maxOrder.next);
  return getAllLinks().find((l) => l.id === id)!;
}

export function updateLink(id: string, title: string, description: string, url: string): Link | null {
  const result = getDb().prepare("UPDATE links SET title = ?, description = ?, url = ? WHERE id = ?").run(title, description, url, id);
  if (result.changes === 0) return null;
  return getAllLinks().find((l) => l.id === id) || null;
}

export function deleteLink(id: string): boolean {
  const result = getDb().prepare("DELETE FROM links WHERE id = ?").run(id);
  return result.changes > 0;
}

// --- Guides ---

export interface Guide {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  authorUsername: string;
  status: "draft" | "pending" | "approved";
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapGuideRow(r: { id: string; title: string; content: string; excerpt: string | null; author_username: string; status: string; approved_by: string | null; approved_at: string | null; created_at: string; updated_at: string }): Guide {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    excerpt: r.excerpt,
    authorUsername: r.author_username,
    status: r.status as Guide["status"],
    approvedBy: r.approved_by,
    approvedAt: r.approved_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function getApprovedGuides(): Guide[] {
  const rows = getDb().prepare("SELECT * FROM guides WHERE status = 'approved' ORDER BY approved_at DESC, created_at DESC").all() as { id: string; title: string; content: string; excerpt: string | null; author_username: string; status: string; approved_by: string | null; approved_at: string | null; created_at: string; updated_at: string }[];
  return rows.map(mapGuideRow);
}

export function getAllGuides(): Guide[] {
  const rows = getDb().prepare("SELECT * FROM guides ORDER BY created_at DESC").all() as { id: string; title: string; content: string; excerpt: string | null; author_username: string; status: string; approved_by: string | null; approved_at: string | null; created_at: string; updated_at: string }[];
  return rows.map(mapGuideRow);
}

export function getGuideById(id: string): Guide | null {
  const row = getDb().prepare("SELECT * FROM guides WHERE id = ?").get(id) as { id: string; title: string; content: string; excerpt: string | null; author_username: string; status: string; approved_by: string | null; approved_at: string | null; created_at: string; updated_at: string } | undefined;
  return row ? mapGuideRow(row) : null;
}

export function createGuide(title: string, content: string, excerpt: string | null, authorUsername: string): Guide {
  const id = `guide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  getDb().prepare("INSERT INTO guides (id, title, content, excerpt, author_username, status) VALUES (?, ?, ?, ?, ?, 'pending')").run(id, title, content, excerpt, authorUsername);
  return getGuideById(id)!;
}

export function updateGuide(id: string, title: string, content: string, excerpt: string | null): Guide | null {
  const result = getDb().prepare("UPDATE guides SET title = ?, content = ?, excerpt = ?, updated_at = datetime('now') WHERE id = ?").run(title, content, excerpt, id);
  if (result.changes === 0) return null;
  return getGuideById(id);
}

export function approveGuide(id: string, approvedBy: string): Guide | null {
  const result = getDb().prepare("UPDATE guides SET status = 'approved', approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(approvedBy, id);
  if (result.changes === 0) return null;
  return getGuideById(id);
}

export function rejectGuide(id: string): Guide | null {
  const result = getDb().prepare("UPDATE guides SET status = 'pending', approved_by = NULL, approved_at = NULL, updated_at = datetime('now') WHERE id = ?").run(id);
  if (result.changes === 0) return null;
  return getGuideById(id);
}

export function deleteGuide(id: string): boolean {
  const result = getDb().prepare("DELETE FROM guides WHERE id = ?").run(id);
  return result.changes > 0;
}

// --- Hangar Categories ---

export interface HangarCategory {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
}

export function getAllHangarCategories(): HangarCategory[] {
  const rows = getDb().prepare("SELECT id, name, description, sort_order FROM hangar_categories ORDER BY sort_order, id").all() as {
    id: string; name: string; description: string; sort_order: number;
  }[];
  return rows.map((r) => ({ id: r.id, name: r.name, description: r.description, sortOrder: r.sort_order }));
}

export function addHangarCategory(name: string, description: string): HangarCategory {
  const db = getDb();
  const id = `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM hangar_categories").get() as { next: number };
  db.prepare("INSERT INTO hangar_categories (id, name, description, sort_order) VALUES (?, ?, ?, ?)").run(id, name, description, maxOrder.next);
  return getAllHangarCategories().find((c) => c.id === id)!;
}

export function updateHangarCategory(id: string, name: string, description: string): HangarCategory | null {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM hangar_categories WHERE id = ?").get(id);
  if (!existing) return null;
  db.prepare("UPDATE hangar_categories SET name = ?, description = ? WHERE id = ?").run(name, description, id);
  return getAllHangarCategories().find((c) => c.id === id) || null;
}

export function deleteHangarCategory(id: string): boolean {
  const db = getDb();
  const hasAssets = db.prepare("SELECT id FROM hangar_assets WHERE category_id = ? LIMIT 1").get(id);
  if (hasAssets) return false;
  const result = db.prepare("DELETE FROM hangar_categories WHERE id = ?").run(id);
  return result.changes > 0;
}

// --- Hangar Assets ---

export interface HangarAsset {
  id: string;
  name: string;
  description: string;
  shipClass: string;
  requirementTag: string;
  requirementCount: number;
  sortOrder: number;
  categoryId: string;
  unlockCallout: string | null;
}

export function getAllHangarAssets(): HangarAsset[] {
  const rows = getDb().prepare("SELECT id, name, description, ship_class, requirement_tag, COALESCE(requirement_count, 2) as requirement_count, sort_order, COALESCE(category_id, 'cat-executive') as category_id, unlock_callout FROM hangar_assets ORDER BY sort_order, id").all() as {
    id: string; name: string; description: string; ship_class: string; requirement_tag: string; requirement_count: number; sort_order: number; category_id: string; unlock_callout: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    shipClass: r.ship_class,
    requirementTag: r.requirement_tag,
    requirementCount: r.requirement_count,
    sortOrder: r.sort_order,
    categoryId: r.category_id,
    unlockCallout: r.unlock_callout ?? null,
  }));
}

export function addHangarAsset(name: string, description: string, shipClass: string, requirementTag: string, categoryId: string, requirementCount: number = 2): HangarAsset {
  const db = getDb();
  const id = `hangar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM hangar_assets").get() as { next: number };
  db.prepare("INSERT INTO hangar_assets (id, name, description, ship_class, requirement_tag, requirement_count, sort_order, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, name, description, shipClass, requirementTag, requirementCount, maxOrder.next, categoryId || "cat-executive");
  return getAllHangarAssets().find((a) => a.id === id)!;
}

export function deleteHangarAsset(id: string): boolean {
  const result = getDb().prepare("DELETE FROM hangar_assets WHERE id = ?").run(id);
  return result.changes > 0;
}

export function updateHangarAsset(id: string, name: string, description: string, shipClass: string, requirementTag: string, categoryId?: string, requirementCount?: number): HangarAsset | null {
  const db = getDb();
  const existing = db.prepare("SELECT id, category_id, requirement_count FROM hangar_assets WHERE id = ?").get(id) as { category_id: string; requirement_count: number } | undefined;
  if (!existing) return null;
  const cat = categoryId ?? existing.category_id ?? "cat-executive";
  const rc = requirementCount ?? existing.requirement_count ?? 2;
  db.prepare("UPDATE hangar_assets SET name = ?, description = ?, ship_class = ?, requirement_tag = ?, category_id = ?, requirement_count = ? WHERE id = ?").run(name, description, shipClass, requirementTag, cat, rc, id);
  return getAllHangarAssets().find((a) => a.id === id) || null;
}

// --- Member Merits ---

export interface MemberMerit {
  id: number;
  username: string;
  tag: string;
  operationId: string;
  operationName: string;
  awardedBy: string;
  awardedAt: string;
}

export function getMemberMerits(username: string): MemberMerit[] {
  return (getDb().prepare("SELECT * FROM member_merits WHERE LOWER(username) = LOWER(?) ORDER BY awarded_at DESC").all(username) as {
    id: number; username: string; tag: string; operation_id: string; operation_name: string; awarded_by: string; awarded_at: string;
  }[]).map((r) => ({ id: r.id, username: r.username, tag: r.tag, operationId: r.operation_id, operationName: r.operation_name, awardedBy: r.awarded_by, awardedAt: r.awarded_at }));
}

export function getAllMerits(): MemberMerit[] {
  return (getDb().prepare("SELECT * FROM member_merits ORDER BY awarded_at DESC").all() as {
    id: number; username: string; tag: string; operation_id: string; operation_name: string; awarded_by: string; awarded_at: string;
  }[]).map((r) => ({ id: r.id, username: r.username, tag: r.tag, operationId: r.operation_id, operationName: r.operation_name, awardedBy: r.awarded_by, awardedAt: r.awarded_at }));
}

export function awardMerits(usernames: string[], tag: string, operationId: string, operationName: string, awardedBy: string): void {
  const db = getDb();
  const insert = db.prepare("INSERT INTO member_merits (username, tag, operation_id, operation_name, awarded_by) VALUES (?, ?, ?, ?, ?)");
  for (const username of usernames) {
    insert.run(username, tag, operationId, operationName, awardedBy);
  }
}

export function revokeMerit(id: number): boolean {
  const result = getDb().prepare("DELETE FROM member_merits WHERE id = ?").run(id);
  return result.changes > 0;
}

// --- Hangar Selections (replaces request flow: click to select, one per category) ---

export interface HangarSelection {
  id: string;
  username: string;
  assetId: string;
  assetName: string;
  categoryId: string;
  selectedAt: string;
}

export function getUserHangarSelections(username: string): HangarSelection[] {
  const db = getDb();
  const rows = db.prepare("SELECT s.id, s.username, s.asset_id, s.selected_at FROM hangar_selections s JOIN hangar_assets a ON s.asset_id = a.id WHERE LOWER(s.username) = LOWER(?)").all(username) as {
    id: string; username: string; asset_id: string; selected_at: string;
  }[];
  return rows.map((r) => {
    const asset = db.prepare("SELECT name, category_id FROM hangar_assets WHERE id = ?").get(r.asset_id) as { name: string; category_id: string } | undefined;
    return {
      id: r.id,
      username: r.username,
      assetId: r.asset_id,
      assetName: asset?.name || "Unknown",
      categoryId: asset?.category_id || "cat-executive",
      selectedAt: r.selected_at,
    };
  });
}

export function getSelectionsForAsset(assetId: string): string[] {
  const rows = getDb().prepare("SELECT username FROM hangar_selections WHERE asset_id = ?").all(assetId) as { username: string }[];
  return rows.map((r) => r.username);
}

export type CreateSelectionResult = { ok: true; selection: HangarSelection } | { ok: false; error: string };

function refundMeritsForSelection(username: string, assetId: string, count: number): void {
  if (count <= 0) return;
  const asset = getDb().prepare("SELECT requirement_tag FROM hangar_assets WHERE id = ?").get(assetId) as { requirement_tag: string } | undefined;
  if (!asset?.requirement_tag) return;
  awardMerits(Array(count).fill(username), asset.requirement_tag, "reward_refund", "Reward refund", "system");
}

export function createHangarSelection(username: string, assetId: string): CreateSelectionResult {
  const db = getDb();
  const asset = db.prepare("SELECT * FROM hangar_assets WHERE id = ?").get(assetId) as { id: string; requirement_tag: string; requirement_count: number; category_id: string } | undefined;
  if (!asset) return { ok: false, error: "Asset not found" };
  const reqTag = asset.requirement_tag || "";
  const reqCount = asset.requirement_count ?? 2;
  if (!reqTag) return { ok: false, error: "Asset has no requirement tag" };
  const meritCount = db.prepare("SELECT COUNT(*) as c FROM member_merits WHERE LOWER(username) = LOWER(?) AND tag = ?").get(username, reqTag) as { c: number };
  if (meritCount.c < reqCount) return { ok: false, error: `You need at least ${reqCount} ${reqTag.replace(/_/g, " ")} merits. You have ${meritCount.c}.` };
  const categoryId = asset.category_id || "cat-executive";
  const existingInCategory = db.prepare(`
    SELECT s.id, s.asset_id FROM hangar_selections s
    JOIN hangar_assets a ON s.asset_id = a.id
    WHERE LOWER(s.username) = LOWER(?) AND (a.category_id = ? OR a.category_id IS NULL AND ? = 'cat-executive')
  `).all(username, categoryId, categoryId) as { id: string; asset_id: string }[];
  for (const ex of existingInCategory) {
    const oldAsset = db.prepare("SELECT requirement_count FROM hangar_assets WHERE id = ?").get(ex.asset_id) as { requirement_count: number } | undefined;
    refundMeritsForSelection(username, ex.asset_id, oldAsset?.requirement_count ?? 2);
    db.prepare("DELETE FROM hangar_selections WHERE id = ?").run(ex.id);
  }
  const idsToConsume = db.prepare("SELECT id FROM member_merits WHERE LOWER(username) = LOWER(?) AND tag = ? ORDER BY id LIMIT ?").all(username, reqTag, reqCount) as { id: number }[];
  for (const { id } of idsToConsume) {
    db.prepare("DELETE FROM member_merits WHERE id = ?").run(id);
  }
  const id = `sel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  db.prepare("INSERT INTO hangar_selections (id, username, asset_id) VALUES (?, ?, ?)").run(id, username, assetId);
  const row = db.prepare("SELECT * FROM hangar_selections WHERE id = ?").get(id) as { id: string; username: string; asset_id: string; selected_at: string };
  const a = db.prepare("SELECT name, category_id FROM hangar_assets WHERE id = ?").get(assetId) as { name: string; category_id: string } | undefined;
  return {
    ok: true,
    selection: {
      id: row.id,
      username: row.username,
      assetId: row.asset_id,
      assetName: a?.name || "Unknown",
      categoryId: a?.category_id || "cat-executive",
      selectedAt: row.selected_at,
    },
  };
}

export function deleteHangarSelectionByUser(assetId: string, username: string): boolean {
  const db = getDb();
  const asset = db.prepare("SELECT requirement_count FROM hangar_assets WHERE id = ?").get(assetId) as { requirement_count: number } | undefined;
  const result = db.prepare("DELETE FROM hangar_selections WHERE asset_id = ? AND LOWER(username) = LOWER(?)").run(assetId, username);
  if (result.changes > 0 && asset) {
    refundMeritsForSelection(username, assetId, asset.requirement_count ?? 2);
  }
  return result.changes > 0;
}

export function deleteSelectionsForAsset(assetId: string): void {
  getDb().prepare("DELETE FROM hangar_selections WHERE asset_id = ?").run(assetId);
}

// --- Hangar Requests (kept for admin view of legacy data, no longer used for new flow) ---

export interface HangarRequest {
  id: string;
  username: string;
  assetId: string;
  assetName: string;
  status: string;
  note: string;
  requestedAt: string;
  resolvedAt: string | null;
  userTags: string[];
}

function buildHangarRequest(r: { id: string; username: string; asset_id: string; status: string; note: string; requested_at: string; resolved_at: string | null }, db: Database.Database): HangarRequest {
  const asset = db.prepare("SELECT name FROM hangar_assets WHERE id = ?").get(r.asset_id) as { name: string } | undefined;
  const merits = db.prepare("SELECT DISTINCT tag FROM member_merits WHERE LOWER(username) = LOWER(?)").all(r.username) as { tag: string }[];
  return {
    id: r.id,
    username: r.username,
    assetId: r.asset_id,
    assetName: asset?.name || "Unknown",
    status: r.status,
    note: r.note,
    requestedAt: r.requested_at,
    resolvedAt: r.resolved_at,
    userTags: merits.map((m) => m.tag),
  };
}

export function getAllHangarRequests(): HangarRequest[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM hangar_requests ORDER BY requested_at DESC").all() as {
    id: string; username: string; asset_id: string; status: string; note: string; requested_at: string; resolved_at: string | null;
  }[];
  return rows.map((r) => buildHangarRequest(r, db));
}

export function getUserHangarRequests(username: string): HangarRequest[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM hangar_requests WHERE LOWER(username) = LOWER(?) ORDER BY requested_at DESC").all(username) as {
    id: string; username: string; asset_id: string; status: string; note: string; requested_at: string; resolved_at: string | null;
  }[];
  return rows.map((r) => buildHangarRequest(r, db));
}

export function deleteHangarRequest(id: string): boolean {
  const result = getDb().prepare("DELETE FROM hangar_requests WHERE id = ?").run(id);
  return result.changes > 0;
}

// --- Raffles ---

export interface RafflePrize {
  assetId: string;
  assetName: string;
  winnerUsername: string | null;
  participantUsernames: string[];
}

export interface Raffle {
  id: string;
  meritTag: string;
  status: string;
  createdAt: string;
  prizes: RafflePrize[];
}

export function createRaffle(meritTag: string, assetIds: string[]): Raffle {
  const db = getDb();
  if (!assetIds.length) throw new Error("At least one prize required");
  const id = `raffle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    db.prepare("INSERT INTO raffles (id, merit_tag, asset_id, status) VALUES (?, ?, ?, 'open')").run(id, meritTag, assetIds[0]);
  } catch {
    db.prepare("INSERT INTO raffles (id, merit_tag, status) VALUES (?, ?, 'open')").run(id, meritTag);
  }
  const insertPrize = db.prepare("INSERT INTO raffle_prizes (id, raffle_id, asset_id, sort_order) VALUES (?, ?, ?, ?)");
  assetIds.forEach((aid, i) => {
    insertPrize.run(`prize-${id}-${i}`, id, aid, i);
  });
  const row = db.prepare("SELECT created_at FROM raffles WHERE id = ?").get(id) as { created_at: string };
  return buildRaffle(db, id, row?.created_at || new Date().toISOString());
}

function buildRaffle(db: Database.Database, id: string, createdAt: string): Raffle {
  const r = db.prepare("SELECT merit_tag, status FROM raffles WHERE id = ?").get(id) as { merit_tag: string; status: string } | undefined;
  if (!r) throw new Error("Raffle not found");
  const prizeRows = db.prepare("SELECT asset_id, winner_username FROM raffle_prizes WHERE raffle_id = ? ORDER BY sort_order").all(id) as { asset_id: string; winner_username: string | null }[];
  const legacy = db.prepare("SELECT asset_id, winner_username FROM raffles WHERE id = ?").get(id) as { asset_id?: string; winner_username?: string } | undefined;
  const prizes: RafflePrize[] = prizeRows.length > 0
    ? prizeRows.map((p) => {
        const asset = db.prepare("SELECT name FROM hangar_assets WHERE id = ?").get(p.asset_id) as { name: string } | undefined;
        return {
          assetId: p.asset_id,
          assetName: asset?.name || "Unknown",
          winnerUsername: p.winner_username,
          participantUsernames: getSelectionsForAsset(p.asset_id),
        };
      })
    : legacy?.asset_id
      ? [{
          assetId: legacy.asset_id,
          assetName: (db.prepare("SELECT name FROM hangar_assets WHERE id = ?").get(legacy.asset_id) as { name: string } | undefined)?.name || "Unknown",
          winnerUsername: legacy.winner_username || null,
          participantUsernames: getSelectionsForAsset(legacy.asset_id),
        }]
      : [];
  return { id, meritTag: r.merit_tag, status: r.status, createdAt, prizes };
}

export type RaffleWithParticipants = Raffle;

export function getAllRaffles(): Raffle[] {
  const db = getDb();
  const rows = db.prepare("SELECT id, created_at FROM raffles ORDER BY created_at DESC").all() as { id: string; created_at: string }[];
  return rows.map((row) => buildRaffle(db, row.id, row.created_at));
}

export function getAllRafflesWithParticipants(): RaffleWithParticipants[] {
  return getAllRaffles();
}

export function drawRaffleWinner(id: string): { winners: { assetId: string; assetName: string; username: string }[] } | null {
  const db = getDb();
  const raffle = db.prepare("SELECT * FROM raffles WHERE id = ?").get(id) as { status: string } | undefined;
  if (!raffle || raffle.status !== "open") return null;
  const prizeRows = db.prepare("SELECT id, asset_id FROM raffle_prizes WHERE raffle_id = ? ORDER BY sort_order").all(id) as { id: string; asset_id: string }[];
  const legacy = db.prepare("SELECT asset_id FROM raffles WHERE id = ?").get(id) as { asset_id?: string } | undefined;
  const assetsToDraw = prizeRows.length > 0 ? prizeRows : (legacy?.asset_id ? [{ id: "legacy", asset_id: legacy.asset_id }] : []);
  const winners: { assetId: string; assetName: string; username: string }[] = [];
  const updatePrize = db.prepare("UPDATE raffle_prizes SET winner_username = ? WHERE id = ?");
  for (const p of assetsToDraw) {
    const participants = getSelectionsForAsset(p.asset_id);
    if (participants.length === 0) continue;
    const winner = participants[Math.floor(Math.random() * participants.length)];
    deleteSelectionsForAsset(p.asset_id);
    if (p.id !== "legacy") updatePrize.run(winner, p.id);
    const asset = db.prepare("SELECT name FROM hangar_assets WHERE id = ?").get(p.asset_id) as { name: string } | undefined;
    winners.push({ assetId: p.asset_id, assetName: asset?.name || "Unknown", username: winner });
  }
  if (winners.length === 0) return null;
  if (legacy?.asset_id && prizeRows.length === 0) {
    db.prepare("UPDATE raffles SET status = 'closed', winner_username = ? WHERE id = ?").run(winners[0].username, id);
  } else {
    db.prepare("UPDATE raffles SET status = 'closed' WHERE id = ?").run(id);
  }
  return { winners };
}

export function updateRaffle(id: string, meritTag?: string, assetIds?: string[]): Raffle | null {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM raffles WHERE id = ?").get(id) as { merit_tag: string } | undefined;
  if (!existing) return null;
  const mt = meritTag ?? existing.merit_tag;
  db.prepare("UPDATE raffles SET merit_tag = ? WHERE id = ?").run(mt, id);
  if (assetIds && assetIds.length > 0) {
    db.prepare("DELETE FROM raffle_prizes WHERE raffle_id = ?").run(id);
    const insert = db.prepare("INSERT INTO raffle_prizes (id, raffle_id, asset_id, sort_order) VALUES (?, ?, ?, ?)");
    assetIds.forEach((aid, i) => insert.run(`prize-${id}-${i}`, id, aid, i));
  }
  const row = db.prepare("SELECT created_at FROM raffles WHERE id = ?").get(id) as { created_at: string };
  return buildRaffle(db, id, row?.created_at || "");
}

export function deleteRaffle(id: string): boolean {
  const result = getDb().prepare("DELETE FROM raffles WHERE id = ?").run(id);
  return result.changes > 0;
}

// --- Blueprint catalog & org unlocks ---

export interface BlueprintCatalogEntry {
  id: string;
  name: string;
  contractLocation: string;
  farmNotes: string;
  materials: string[];
  usageNotes: string;
  sortOrder: number;
}

export interface BlueprintHolder {
  username: string;
  unlockedAt: string;
}

export function getBlueprintCatalog(): BlueprintCatalogEntry[] {
  const rows = getDb()
    .prepare(
      "SELECT id, name, contract_location, farm_notes, materials_json, usage_notes, sort_order FROM blueprint_catalog ORDER BY sort_order, name"
    )
    .all() as {
      id: string;
      name: string;
      contract_location: string;
      farm_notes: string;
      materials_json: string;
      usage_notes: string;
      sort_order: number;
    }[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    contractLocation: r.contract_location,
    farmNotes: r.farm_notes,
    materials: safeParseMaterials(r.materials_json),
    usageNotes: r.usage_notes,
    sortOrder: r.sort_order,
  }));
}

function safeParseMaterials(json: string): string[] {
  try {
    const p = JSON.parse(json) as unknown;
    return Array.isArray(p) ? p.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function getBlueprintIdsForUser(userId: number): Set<string> {
  const rows = getDb()
    .prepare("SELECT blueprint_id FROM org_blueprints WHERE user_id = ?")
    .all(userId) as { blueprint_id: string }[];
  return new Set(rows.map((r) => r.blueprint_id));
}

export function setUserBlueprintUnlocked(userId: number, blueprintId: string, unlocked: boolean): boolean {
  const db = getDb();
  const cat = db.prepare("SELECT id FROM blueprint_catalog WHERE id = ?").get(blueprintId);
  if (!cat) return false;
  if (unlocked) {
    db.prepare(
      "INSERT INTO org_blueprints (user_id, blueprint_id, unlocked_at) VALUES (?, ?, datetime('now')) ON CONFLICT(user_id, blueprint_id) DO UPDATE SET unlocked_at = excluded.unlocked_at"
    ).run(userId, blueprintId);
  } else {
    db.prepare("DELETE FROM org_blueprints WHERE user_id = ? AND blueprint_id = ?").run(userId, blueprintId);
  }
  return true;
}

export function getBlueprintRoster(): { blueprintId: string; holders: BlueprintHolder[] }[] {
  const db = getDb();
  const ids = db.prepare("SELECT id FROM blueprint_catalog ORDER BY sort_order, name").all() as { id: string }[];
  const q = db.prepare(
    `SELECT ob.blueprint_id, u.username, ob.unlocked_at
     FROM org_blueprints ob
     JOIN users u ON u.id = ob.user_id
     ORDER BY ob.blueprint_id, LOWER(u.username)`
  );
  const rows = q.all() as { blueprint_id: string; username: string; unlocked_at: string }[];
  const byBp = new Map<string, BlueprintHolder[]>();
  for (const r of rows) {
    if (!byBp.has(r.blueprint_id)) byBp.set(r.blueprint_id, []);
    byBp.get(r.blueprint_id)!.push({ username: r.username, unlockedAt: r.unlocked_at });
  }
  return ids.map((i) => ({
    blueprintId: i.id,
    holders: byBp.get(i.id) ?? [],
  }));
}

// --- Member ship hangar (pledge vs in-game) — visible org-wide ---

export type ShipHangarAcquisition = "pledge" | "ingame";

export interface MemberShipHangarRow {
  shipSlug: string;
  acquisition: ShipHangarAcquisition;
  updatedAt: string;
}

export function getMemberShipHangarForUser(userId: number): MemberShipHangarRow[] {
  const rows = getDb()
    .prepare(
      "SELECT ship_slug as shipSlug, acquisition, updated_at as updatedAt FROM member_ship_hangar WHERE user_id = ? ORDER BY ship_slug"
    )
    .all(userId) as { shipSlug: string; acquisition: ShipHangarAcquisition; updatedAt: string }[];
  return rows;
}

export function setMemberShipHangar(
  userId: number,
  shipSlug: string,
  acquisition: ShipHangarAcquisition | null
): void {
  const db = getDb();
  const slug = shipSlug.trim();
  if (!slug) return;
  if (acquisition === null) {
    db.prepare("DELETE FROM member_ship_hangar WHERE user_id = ? AND ship_slug = ?").run(userId, slug);
    return;
  }
  db.prepare(
    `INSERT INTO member_ship_hangar (user_id, ship_slug, acquisition, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, ship_slug) DO UPDATE SET
       acquisition = excluded.acquisition,
       updated_at = excluded.updated_at`
  ).run(userId, slug, acquisition);
}

export interface OrgFleetShipEntry {
  username: string;
  shipSlug: string;
  acquisition: ShipHangarAcquisition;
  updatedAt: string;
}

export function getOrgFleetShipHangar(): OrgFleetShipEntry[] {
  return getDb()
    .prepare(
      `SELECT u.username as username, m.ship_slug as shipSlug, m.acquisition as acquisition, m.updated_at as updatedAt
       FROM member_ship_hangar m
       JOIN users u ON u.id = m.user_id
       ORDER BY LOWER(u.username), m.ship_slug`
    )
    .all() as OrgFleetShipEntry[];
}
