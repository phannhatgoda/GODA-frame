import "server-only";
import { createClient, type Client, type InValue } from "@libsql/client";
import { mkdirSync } from "node:fs";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  org_name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  plan TEXT NOT NULL DEFAULT 'free',
  features TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
);
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'avatar',
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  theme TEXT NOT NULL DEFAULT '{}',
  config TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_campaigns_owner ON campaigns(owner_id);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  visitor_id TEXT,
  device TEXT,
  source TEXT,
  meta TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_campaign_time ON events(campaign_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_time ON events(created_at);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner_id);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT,
  created_at INTEGER NOT NULL
);
`;

const g = globalThis as unknown as { __godaDb?: Client; __godaDbReady?: Promise<void> };

function client(): Client {
  if (!g.__godaDb) {
    const url = process.env.DATABASE_URL || "file:./data/goda-frame.db";
    if (url.startsWith("file:")) mkdirSync("./data", { recursive: true });
    g.__godaDb = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
  }
  return g.__godaDb;
}

async function ready() {
  if (!g.__godaDbReady) {
    g.__godaDbReady = (async () => {
      const c = client();
      await c.execute("PRAGMA foreign_keys = ON").catch(() => {});
      await c.execute("PRAGMA journal_mode = WAL").catch(() => {});
      await c.executeMultiple(SCHEMA);
    })();
  }
  return g.__godaDbReady;
}

export type Row = Record<string, unknown>;

export async function all<T = Row>(sql: string, args: InValue[] = []): Promise<T[]> {
  await ready();
  const r = await client().execute({ sql, args });
  return r.rows.map((row) => ({ ...row }) as T);
}

export async function one<T = Row>(sql: string, args: InValue[] = []): Promise<T | null> {
  const rows = await all<T>(sql, args);
  return rows[0] ?? null;
}

export async function run(sql: string, args: InValue[] = []) {
  await ready();
  return client().execute({ sql, args });
}

export async function audit(actorId: string | null, action: string, target?: string, detail?: unknown) {
  await run("INSERT INTO audit_logs (actor_id, action, target, detail, created_at) VALUES (?,?,?,?,?)", [
    actorId,
    action,
    target ?? null,
    detail ? JSON.stringify(detail) : null,
    Date.now(),
  ]);
}
