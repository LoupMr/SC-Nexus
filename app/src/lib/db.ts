import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "sc-nexus.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  const dir = path.dirname(DB_PATH);
  const fs = require("fs");
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
  `);

  const adminExists = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");
  if (!adminExists) {
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run(
      "admin",
      simpleHash("Barcelona2412"),
      "admin"
    );
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

// --- Hashing (same algorithm as before for compatibility) ---

export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + str.length.toString(36);
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
}

export function findUserByUsername(username: string): DbUser | undefined {
  return getDb().prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?)").get(username) as DbUser | undefined;
}

export function createUser(username: string, passwordHash: string, role: string = "viewer") {
  getDb().prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run(username, passwordHash, role);
  return findUserByUsername(username)!;
}

export function getAllUsers(): { username: string; role: string }[] {
  return getDb().prepare("SELECT username, role FROM users ORDER BY id").all() as { username: string; role: string }[];
}

export function updateUserRole(username: string, role: string) {
  getDb().prepare("UPDATE users SET role = ? WHERE LOWER(username) = LOWER(?)").run(role, username);
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

export function getUserBySession(token: string): { id: number; username: string; role: string } | undefined {
  return getDb().prepare(`
    SELECT u.id, u.username, u.role FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
  `).get(token) as { id: number; username: string; role: string } | undefined;
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

// --- Ledger ---

interface DbLedgerRow {
  id: string;
  item_name: string;
  subcategory: string;
  owner: string;
  status: string;
  quantity: number;
  location: string;
}

interface DbHistoryRow {
  id: number;
  ledger_id: string;
  action: string;
  username: string;
  quantity: number;
  timestamp: string;
}

export interface LedgerEntryWithHistory {
  id: string;
  itemName: string;
  subcategory: string;
  owner: string;
  status: string;
  quantity: number;
  location: string;
  history: { action: string; user: string; timestamp: string; quantity: number }[];
}

function deriveStatus(qty: number): string {
  if (qty <= 0) return "Depleted";
  if (qty <= 3) return "Low Stock";
  return "Available";
}

export function getAllLedgerEntries(): LedgerEntryWithHistory[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM ledger ORDER BY rowid").all() as DbLedgerRow[];
  return rows.map((row) => {
    const history = db.prepare(
      "SELECT action, username, quantity, timestamp FROM ledger_history WHERE ledger_id = ? ORDER BY id"
    ).all(row.id) as { action: string; username: string; quantity: number; timestamp: string }[];
    return {
      id: row.id,
      itemName: row.item_name,
      subcategory: row.subcategory,
      owner: row.owner,
      status: row.status,
      quantity: row.quantity,
      location: row.location,
      history: history.map((h) => ({ action: h.action, user: h.username, timestamp: h.timestamp, quantity: h.quantity })),
    };
  });
}

export function addLedgerEntry(itemName: string, subcategory: string, owner: string, quantity: number, location: string): LedgerEntryWithHistory {
  const db = getDb();

  const existing = db.prepare(
    "SELECT * FROM ledger WHERE LOWER(item_name) = LOWER(?) AND LOWER(location) = LOWER(?)"
  ).get(itemName, location) as DbLedgerRow | undefined;

  if (existing) {
    const newQty = existing.quantity + quantity;
    const newStatus = deriveStatus(newQty);
    db.prepare("UPDATE ledger SET quantity = ?, status = ? WHERE id = ?").run(newQty, newStatus, existing.id);
    db.prepare("INSERT INTO ledger_history (ledger_id, action, username, quantity) VALUES (?, ?, ?, ?)").run(
      existing.id, "added", owner, quantity
    );
    return getAllLedgerEntries().find((e) => e.id === existing.id)!;
  }

  const id = `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const status = deriveStatus(quantity);
  db.prepare("INSERT INTO ledger (id, item_name, subcategory, owner, status, quantity, location) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    id, itemName, subcategory, owner, status, quantity, location
  );
  db.prepare("INSERT INTO ledger_history (ledger_id, action, username, quantity) VALUES (?, ?, ?, ?)").run(
    id, "added", owner, quantity
  );
  return getAllLedgerEntries().find((e) => e.id === id)!;
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
  return getAllLedgerEntries().find((e) => e.id === entryId) || null;
}

export function deleteLedgerEntry(entryId: string): boolean {
  const result = getDb().prepare("DELETE FROM ledger WHERE id = ?").run(entryId);
  return result.changes > 0;
}

// --- Operations ---

interface DbOpRow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
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

export function createOperation(title: string, description: string, status: string, priority: string, steps: Omit<OperationStep, "id">[]): OperationWithSteps {
  const db = getDb();
  const id = `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  db.prepare("INSERT INTO operations (id, title, description, status, priority) VALUES (?, ?, ?, ?, ?)").run(id, title, description, status, priority);
  const insert = db.prepare("INSERT INTO operation_steps (operation_id, step_order, station, target, requirements, description, map_url) VALUES (?, ?, ?, ?, ?, ?, ?)");
  for (const s of steps) {
    insert.run(id, s.order, s.station, s.target, s.requirements, s.description, s.mapUrl);
  }
  return getAllOperations().find((o) => o.id === id)!;
}

export function updateOperation(opId: string, title: string, description: string, status: string, priority: string, steps: Omit<OperationStep, "id">[]): OperationWithSteps | null {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM operations WHERE id = ?").get(opId);
  if (!existing) return null;
  db.prepare("UPDATE operations SET title = ?, description = ?, status = ?, priority = ? WHERE id = ?").run(title, description, status, priority, opId);
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
