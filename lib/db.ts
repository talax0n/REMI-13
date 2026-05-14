import { Pool, QueryResultRow } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Create .env.local with DATABASE_URL=postgres://user:pass@host:5432/db ' +
        '(use Neon/Vercel Postgres for prod, or a local Postgres for dev).'
    );
  }
  return new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: /sslmode=require|neon\.tech|vercel-storage\.com|supabase\.co/.test(connectionString)
      ? { rejectUnauthorized: false }
      : undefined,
  });
}

export const pool: Pool = globalThis._pgPool ?? (globalThis._pgPool = createPool());

let migrationPromise: Promise<void> | null = null;

export async function ensureMigrated(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = runMigration();
  }
  await migrationPromise;
}

async function runMigration(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        team TEXT NOT NULL,
        total_score INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        current_table INTEGER,
        scores JSONB NOT NULL DEFAULT '{}',
        opponents JSONB NOT NULL DEFAULT '[]',
        matches_played INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS game_tables (
        id TEXT PRIMARY KEY,
        number INTEGER NOT NULL,
        players JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tournament_state (
        id INTEGER PRIMARY KEY,
        phase INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'waiting',
        max_phases INTEGER NOT NULL DEFAULT 5,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      INSERT INTO tournament_state (id, phase, status, max_phases)
      VALUES (1, 1, 'waiting', 6)
      ON CONFLICT (id) DO NOTHING;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'church'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'team'
        ) THEN
          ALTER TABLE players RENAME COLUMN church TO team;
        ELSIF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'church'
        ) AND EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'players' AND column_name = 'team'
        ) THEN
          UPDATE players SET team = church WHERE team IS NULL OR team = '';
          ALTER TABLE players ALTER COLUMN church DROP NOT NULL;
        END IF;
      END $$;
    `);
  } finally {
    client.release();
  }
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  await ensureMigrated();
  const result = await pool.query<T>(text, params);
  return result.rows;
}
