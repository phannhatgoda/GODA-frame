import "server-only";
import postgres from "postgres";

/**
 * Postgres (Neon) data layer.
 * Works on Vercel (Fluid compute reuses the pool across requests) and on any Postgres for local dev.
 * Queries are written with `?` placeholders and converted to `$1, $2…` here.
 */

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    org_name TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    plan TEXT NOT NULL DEFAULT 'free',
    features TEXT NOT NULL DEFAULT '{}',
    created_at BIGINT NOT NULL,
    last_login_at BIGINT
  )`,
  `CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'avatar',
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    theme TEXT NOT NULL DEFAULT '{}',
    config TEXT NOT NULL DEFAULT '{}',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_campaigns_owner ON campaigns(owner_id)`,
  `CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    visitor_id TEXT,
    device TEXT,
    source TEXT,
    meta TEXT,
    created_at BIGINT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_events_campaign_time ON events(campaign_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_events_time ON events(created_at)`,
  `CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    data BYTEA NOT NULL,
    created_at BIGINT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner_id)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id TEXT,
    action TEXT NOT NULL,
    target TEXT,
    detail TEXT,
    created_at BIGINT NOT NULL
  )`,
  // v2 — admin-defined plans, custom domains, API keys
  `CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    features TEXT NOT NULL DEFAULT '{}',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    sort INTEGER NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hostname TEXT NOT NULL UNIQUE,
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
    verify_token TEXT NOT NULL,
    verified_at BIGINT,
    created_at BIGINT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_domains_owner ON domains(owner_id)`,
  `CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    created_at BIGINT NOT NULL,
    last_used_at BIGINT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON api_keys(owner_id)`,
  `CREATE TABLE IF NOT EXISTS schema_meta (k TEXT PRIMARY KEY, v INTEGER NOT NULL)`,
  // v3 — short-lived downloads for in-app browsers (Zalo, Facebook…) that cannot save blob: URLs
  `CREATE TABLE IF NOT EXISTS temp_files (
    id TEXT PRIMARY KEY,
    campaign_id TEXT,
    name TEXT NOT NULL,
    mime TEXT NOT NULL,
    data BYTEA NOT NULL,
    created_at BIGINT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_temp_files_time ON temp_files(created_at)`,
];

/** Bump when SCHEMA changes; every statement above must stay idempotent. */
const SCHEMA_VERSION = 3;

type Sql = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __godaSql?: Sql; __godaReady?: Promise<void> };

function dbUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL chưa được cấu hình");
  return url;
}

function sql(): Sql {
  if (!g.__godaSql) {
    const url = dbUrl();
    const local = /localhost|127\.0\.0\.1/.test(url);
    g.__godaSql = postgres(url, {
      max: process.env.VERCEL ? 3 : 10,
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false, // required behind Neon's PgBouncer pooler
      ssl: local ? false : "require",
      onnotice: () => {},
      types: {
        // COUNT(*), SUM(), BIGINT timestamps → JS number
        bigint: { to: 20, from: [20], serialize: (v: number) => String(v), parse: (v: string) => Number(v) },
        numeric: { to: 1700, from: [1700], serialize: (v: number) => String(v), parse: (v: string) => Number(v) },
      },
    });
  }
  return g.__godaSql;
}

async function ready() {
  if (!g.__godaReady) {
    g.__godaReady = (async () => {
      const s = sql();
      // Fast path on warm DBs: one round-trip instead of re-running every DDL statement.
      // (two queries: Postgres resolves table names at parse time, even inside an untaken CASE branch)
      const [t] = await s.unsafe(`SELECT to_regclass('public.schema_meta') IS NOT NULL AS ok`);
      if (t?.ok) {
        const [r] = await s.unsafe(`SELECT v FROM schema_meta WHERE k = 'version'`);
        if (Number(r?.v) >= SCHEMA_VERSION) return;
      }
      await s.begin(async (tx) => {
        await tx.unsafe(`SELECT pg_advisory_xact_lock(424242)`); // avoid races between cold starts
        for (const stmt of SCHEMA) await tx.unsafe(stmt);
        await seedPlans(tx);
        await tx.unsafe(
          `INSERT INTO schema_meta (k, v) VALUES ('version', ${SCHEMA_VERSION}) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`,
        );
      });
    })().catch((e) => {
      g.__godaReady = undefined;
      throw e;
    });
  }
  return g.__godaReady;
}

async function seedPlans(tx: { unsafe: Sql["unsafe"] }) {
  const [c] = await tx.unsafe(`SELECT COUNT(*) AS n FROM plans`);
  if (Number(c?.n) > 0) return;
  const { DEFAULT_PLANS } = await import("./features");
  let i = 0;
  for (const p of DEFAULT_PLANS) {
    await tx.unsafe(
      `INSERT INTO plans (id, name, price, description, features, is_default, sort, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [p.id, p.name, p.price, p.description, JSON.stringify(p.features), p.id === "free", i++, Date.now()],
    );
  }
}

export type Row = Record<string, unknown>;
type Param = string | number | boolean | null | Buffer | Uint8Array;

function toPg(q: string) {
  let i = 0;
  return q.replace(/\?/g, () => `$${++i}`);
}

export async function all<T = Row>(q: string, args: Param[] = []): Promise<T[]> {
  await ready();
  const rows = await sql().unsafe(toPg(q), args as never[]);
  return rows.map((r) => ({ ...r }) as T);
}

export async function one<T = Row>(q: string, args: Param[] = []): Promise<T | null> {
  const rows = await all<T>(q, args);
  return rows[0] ?? null;
}

export async function run(q: string, args: Param[] = []) {
  await ready();
  return sql().unsafe(toPg(q), args as never[]);
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
