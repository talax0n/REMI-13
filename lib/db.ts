import { Pool, QueryResultRow } from 'pg';
import { LEGACY_SEMIFINAL_PHASE, REMI13_RULES } from './tournament-config';

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
        semifinal_cutoff INTEGER NOT NULL DEFAULT 20,
        final_cutoff INTEGER NOT NULL DEFAULT 10,
        semifinal_phase INTEGER NOT NULL DEFAULT 6,
        final_phase INTEGER NOT NULL DEFAULT 5,
        timer_status TEXT NOT NULL DEFAULT 'idle',
        timer_phase INTEGER NOT NULL DEFAULT 1,
        timer_kocokan INTEGER NOT NULL DEFAULT 1,
        timer_duration_seconds INTEGER NOT NULL DEFAULT 900,
        timer_remaining_seconds INTEGER NOT NULL DEFAULT 900,
        timer_started_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Keep the parameterized statement separate from the multi-command DDL
    // above. PostgreSQL does not allow multiple commands in a prepared
    // statement, which node-postgres uses whenever query parameters are passed.
    await client.query(
      `INSERT INTO tournament_state (id, phase, status, max_phases)
       VALUES (1, 1, 'waiting', $1)
       ON CONFLICT (id) DO NOTHING`,
      [REMI13_RULES.totalPhases]
    );

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tournament_state' AND column_name = 'semifinal_cutoff'
        ) THEN
          ALTER TABLE tournament_state ADD COLUMN semifinal_cutoff INTEGER NOT NULL DEFAULT 20;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tournament_state' AND column_name = 'final_cutoff'
        ) THEN
          ALTER TABLE tournament_state ADD COLUMN final_cutoff INTEGER NOT NULL DEFAULT 10;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tournament_state' AND column_name = 'semifinal_phase'
        ) THEN
          ALTER TABLE tournament_state ADD COLUMN semifinal_phase INTEGER NOT NULL DEFAULT 5;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tournament_state' AND column_name = 'final_phase'
        ) THEN
          ALTER TABLE tournament_state ADD COLUMN final_phase INTEGER NOT NULL DEFAULT 6;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tournament_state' AND column_name = 'final_wildcard_ids'
        ) THEN
          ALTER TABLE tournament_state ADD COLUMN final_wildcard_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tournament_state' AND column_name = 'timer_status'
        ) THEN
          ALTER TABLE tournament_state ADD COLUMN timer_status TEXT NOT NULL DEFAULT 'idle';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tournament_state' AND column_name = 'timer_phase'
        ) THEN
          ALTER TABLE tournament_state ADD COLUMN timer_phase INTEGER NOT NULL DEFAULT 1;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tournament_state' AND column_name = 'timer_kocokan'
        ) THEN
          ALTER TABLE tournament_state ADD COLUMN timer_kocokan INTEGER NOT NULL DEFAULT 1;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tournament_state' AND column_name = 'timer_duration_seconds'
        ) THEN
          ALTER TABLE tournament_state ADD COLUMN timer_duration_seconds INTEGER NOT NULL DEFAULT 900;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tournament_state' AND column_name = 'timer_remaining_seconds'
        ) THEN
          ALTER TABLE tournament_state ADD COLUMN timer_remaining_seconds INTEGER NOT NULL DEFAULT 900;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tournament_state' AND column_name = 'timer_started_at'
        ) THEN
          ALTER TABLE tournament_state ADD COLUMN timer_started_at TIMESTAMPTZ;
        END IF;

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
          ALTER TABLE players DROP COLUMN church;
        END IF;
      END $$;
    `);

    // The competition format is now fixed: five cumulative regular phases,
    // with no semifinal or final elimination stage. Keep the legacy columns
    // internally so older score rows and clients remain readable.
    await client.query(
      `UPDATE tournament_state
       SET max_phases = $1,
           semifinal_phase = $2,
           final_phase = $3,
           updated_at = NOW()
       WHERE id = 1`,
      [REMI13_RULES.totalPhases, LEGACY_SEMIFINAL_PHASE, REMI13_RULES.totalPhases]
    );
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
