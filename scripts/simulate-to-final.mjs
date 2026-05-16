// Seed the DB with 20 simulated players already through phases 1-5 so the
// admin UI is one shuffle away from the final phase. Usage:
//   node --env-file=.env.local scripts/simulate-to-final.mjs
// or:
//   DATABASE_URL=... node scripts/simulate-to-final.mjs

import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Pass it via --env-file=.env.local or env var.');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: /sslmode=require|neon\.tech|vercel-storage\.com|supabase\.co/.test(connectionString)
    ? { rejectUnauthorized: false }
    : undefined,
});

const N = 20;
const TEAMS = ['Alpha', 'Beta', 'Gamma', 'Delta'];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function ensureMigrated(client) {
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
      max_phases INTEGER NOT NULL DEFAULT 6,
      semifinal_cutoff INTEGER NOT NULL DEFAULT 20,
      final_cutoff INTEGER NOT NULL DEFAULT 10,
      semifinal_phase INTEGER NOT NULL DEFAULT 5,
      final_phase INTEGER NOT NULL DEFAULT 6,
      final_wildcard_ids JSONB NOT NULL DEFAULT '[]',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    INSERT INTO tournament_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
  `);
  // Ensure newer column exists on older DBs.
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tournament_state' AND column_name = 'final_wildcard_ids'
      ) THEN
        ALTER TABLE tournament_state ADD COLUMN final_wildcard_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
      END IF;
    END $$;
  `);
}

async function main() {
  const client = await pool.connect();
  try {
    await ensureMigrated(client);
    await client.query('BEGIN');
    await client.query('DELETE FROM players');
    await client.query('DELETE FROM game_tables');

    const ts = new Date().toISOString();
    const players = [];

    for (let i = 0; i < N; i++) {
      const id = `sim-${String(i + 1).padStart(2, '0')}`;
      const name = `Sim ${String(i + 1).padStart(2, '0')}`;
      const team = TEAMS[i % TEAMS.length];
      const p1 = rand(40, 100);
      const p2 = rand(40, 100);
      const p3 = rand(40, 100);
      const p4 = rand(40, 100);
      const p5 = rand(40, 100); // semifinal phase score
      const total = p1 + p2 + p3 + p4; // total_score = sum of regular phases only

      players.push({ id, name, team, total, p1, p2, p3, p4, p5 });
    }

    // Rank by total to assign semifinal tables (round-robin 1..4 top-down).
    players.sort((a, b) => b.total - a.total);
    players.forEach((p, idx) => {
      p.tableNumber = (idx % 4) + 1;
    });

    for (const p of players) {
      const scores = {
        '1': { points: p.p1, timestamp: ts },
        '2': { points: p.p2, timestamp: ts },
        '3': { points: p.p3, timestamp: ts },
        '4': { points: p.p4, timestamp: ts },
        '5': { points: p.p5, tableNumber: p.tableNumber, timestamp: ts },
      };
      await client.query(
        `INSERT INTO players (id, name, team, total_score, status, current_table, scores, opponents, matches_played)
         VALUES ($1, $2, $3, $4, 'active', $5, $6::jsonb, '[]'::jsonb, 5)`,
        [p.id, p.name, p.team, p.total, p.tableNumber, JSON.stringify(scores)],
      );
    }

    // Tournament is parked at phase 5 (semifinal) with all phase-5 scores
    // already recorded. Admin's shuffleTargetPhase will resolve to 6 -> click
    // "Generate / Shuffle Tables" to fire the new final pairing logic.
    await client.query(
      `UPDATE tournament_state
       SET phase = 5,
           status = 'in_progress',
           max_phases = 6,
           semifinal_phase = 5,
           final_phase = 6,
           semifinal_cutoff = 20,
           final_cutoff = 10,
           final_wildcard_ids = '[]'::jsonb,
           updated_at = NOW()
       WHERE id = 1`,
    );

    await client.query('COMMIT');

    console.log('Seeded 20 players through phases 1-5.');
    console.log('Semifinal table distribution:');
    for (let t = 1; t <= 4; t++) {
      const members = players
        .filter((p) => p.tableNumber === t)
        .sort((a, b) => b.p5 - a.p5)
        .map((p) => `${p.name}(p5=${p.p5})`);
      console.log(`  Table ${t}: ${members.join(', ')}`);
    }
    console.log('Open /admin and click "Generate / Shuffle Tables" to trigger the final.');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
