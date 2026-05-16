import { PlayerScore, PhaseScore } from '@/app/player/types';
import { query } from './db';

interface PlayerRow {
  id: string;
  name: string;
  team: string;
  total_score: number;
  status: string;
  current_table: number | null;
  scores: Record<string, PhaseScore>;
  opponents: string[];
  matches_played: number;
}

type AdminParticipantInput = {
  id: string;
  name: string;
  team?: string;
  church?: string;
  score: number;
  status: string;
  tableNumber?: number;
  opponents?: string[];
  matchesPlayed?: number;
};

function getInputTeam(participant: AdminParticipantInput): string {
  return participant.team ?? participant.church ?? '';
}

function rowToPlayerScore(row: PlayerRow): PlayerScore {
  return {
    id: row.id,
    name: row.name,
    team: row.team,
    totalScore: row.total_score,
    status: row.status as PlayerScore['status'],
    currentTable: row.current_table ?? undefined,
    scores: row.scores ?? {},
  };
}

export async function getPlayerScores(): Promise<PlayerScore[]> {
  const rows = await query<PlayerRow>(
    'SELECT * FROM players ORDER BY total_score DESC, current_table ASC NULLS LAST, name ASC'
  );
  return rows.map(rowToPlayerScore);
}

export async function getLeaderboard(): Promise<PlayerScore[]> {
  const rows = await query<PlayerRow>(
    `SELECT * FROM players
     WHERE status NOT IN ('archived', 'inactive', 'eliminated')
     ORDER BY total_score DESC, current_table ASC NULLS LAST, name ASC`
  );
  return rows.map(rowToPlayerScore);
}

export async function getPlayerByNameAndTeam(
  name: string,
  team: string
): Promise<PlayerScore | null> {
  const rows = await query<PlayerRow>(
    `SELECT * FROM players
     WHERE LOWER(name) = LOWER($1)
       AND LOWER(team) = LOWER($2)
       AND status NOT IN ('archived', 'inactive')`,
    [name, team]
  );
  return rows.length > 0 ? rowToPlayerScore(rows[0]) : null;
}

export async function deletePlayer(playerId: string): Promise<void> {
  await query('DELETE FROM players WHERE id = $1', [playerId]);
}

export async function deletePlayers(playerIds: string[]): Promise<number> {
  if (playerIds.length === 0) return 0;
  const rows = await query<{ id: string }>(
    'DELETE FROM players WHERE id = ANY($1::text[]) RETURNING id',
    [playerIds]
  );
  return rows.length;
}

export async function updatePlayerPhaseScore(
  playerId: string,
  phase: number,
  points: number,
  tableNumber?: number
): Promise<void> {
  const phaseScore: PhaseScore = {
    points,
    tableNumber,
    timestamp: new Date().toISOString(),
  };
  await query(
    `UPDATE players
     SET total_score = (
           SELECT COALESCE(SUM((phase_entry.value ->> 'points')::integer), 0)::integer
           FROM jsonb_each(scores || jsonb_build_object($1::text, $2::jsonb)) AS phase_entry(key, value)
           WHERE phase_entry.key::integer < COALESCE(
             (SELECT semifinal_phase FROM tournament_state WHERE id = 1),
             5
           )
         ),
          matches_played = matches_played
            + CASE WHEN scores ? $1::text THEN 0 ELSE 1 END,
          scores = scores || jsonb_build_object($1::text, $2::jsonb),
         updated_at = NOW()
     WHERE id = $3`,
    [String(phase), JSON.stringify(phaseScore), playerId]
  );
}

// Strip a single phase entry from every player's scores jsonb, decrement
// matches_played for players that had a score for that phase, and recompute
// total_score from the remaining regular-phase entries. Used by phase-back
// to fully roll back a phase.
export async function wipePhaseScores(phase: number): Promise<void> {
  await query(
    `UPDATE players
     SET matches_played = GREATEST(0, matches_played - CASE WHEN scores ? $1::text THEN 1 ELSE 0 END),
         total_score = (
           SELECT COALESCE(SUM((phase_entry.value ->> 'points')::integer), 0)::integer
           FROM jsonb_each(scores - $1::text) AS phase_entry(key, value)
           WHERE phase_entry.key::integer < COALESCE(
             (SELECT semifinal_phase FROM tournament_state WHERE id = 1),
             5
           )
         ),
         scores = scores - $1::text,
         updated_at = NOW()`,
    [String(phase)]
  );
}

export async function resetAllPlayerScores(): Promise<void> {
  await query(
    `UPDATE players
     SET total_score = 0,
         matches_played = 0,
         scores = '{}'::jsonb,
         updated_at = NOW()`
  );
}

export async function replaceAllAdminParticipants(
  adminParticipants: AdminParticipantInput[]
): Promise<void> {
  await query('DELETE FROM players');
  await syncFromAdminParticipants(adminParticipants);
}

export async function syncFromAdminParticipants(
  adminParticipants: AdminParticipantInput[]
): Promise<void> {
  if (adminParticipants.length === 0) return;

  // Identity + assignment fields only. total_score, matches_played, and scores
  // are owned by updatePlayerPhaseScore so a roster sync from the admin client
  // can never overwrite a recorded score with a stale cached value.
  const placeholders = adminParticipants
    .map((_, i) => {
      const b = i * 8;
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}::integer, $${b + 5}, $${b + 6}::integer, $${b + 7}::jsonb, $${b + 8}::integer)`;
    })
    .join(', ');

  const params = adminParticipants.flatMap((ap) => [
    ap.id,
    ap.name,
    getInputTeam(ap),
    ap.score,
    ap.status,
    ap.tableNumber ?? null,
    JSON.stringify(ap.opponents ?? []),
    ap.matchesPlayed ?? 0,
  ]);

  await query(
    `INSERT INTO players (id, name, team, total_score, status, current_table, opponents, matches_played)
     VALUES ${placeholders}
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       team = EXCLUDED.team,
       status = EXCLUDED.status,
       current_table = EXCLUDED.current_table,
       opponents = EXCLUDED.opponents,
       updated_at = NOW()`,
    params
  );
}

export const MAX_PHASES = 6;
