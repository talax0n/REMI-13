import { PlayerScore, PhaseScore } from '@/app/player/types';
import { query } from './db';

interface PlayerRow {
  id: string;
  name: string;
  church: string;
  total_score: number;
  status: string;
  current_table: number | null;
  scores: Record<string, PhaseScore>;
  opponents: string[];
  matches_played: number;
}

function rowToPlayerScore(row: PlayerRow): PlayerScore {
  return {
    id: row.id,
    name: row.name,
    church: row.church,
    totalScore: row.total_score,
    status: row.status as PlayerScore['status'],
    currentTable: row.current_table ?? undefined,
    scores: row.scores ?? {},
  };
}

export async function getPlayerScores(): Promise<PlayerScore[]> {
  const rows = await query<PlayerRow>('SELECT * FROM players ORDER BY total_score DESC');
  return rows.map(rowToPlayerScore);
}

export async function getLeaderboard(): Promise<PlayerScore[]> {
  const rows = await query<PlayerRow>(
    "SELECT * FROM players WHERE status != 'eliminated' ORDER BY total_score DESC"
  );
  return rows.map(rowToPlayerScore);
}

export async function getPlayerByNameAndChurch(
  name: string,
  church: string
): Promise<PlayerScore | null> {
  const rows = await query<PlayerRow>(
    'SELECT * FROM players WHERE LOWER(name) = LOWER($1) AND LOWER(church) = LOWER($2)',
    [name, church]
  );
  return rows.length > 0 ? rowToPlayerScore(rows[0]) : null;
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
     SET scores = scores || jsonb_build_object($1::text, $2::jsonb),
         updated_at = NOW()
     WHERE id = $3`,
    [String(phase), JSON.stringify(phaseScore), playerId]
  );
}

export async function syncFromAdminParticipants(
  adminParticipants: Array<{
    id: string;
    name: string;
    church: string;
    score: number;
    status: string;
    tableNumber?: number;
    opponents?: string[];
    matchesPlayed?: number;
  }>
): Promise<void> {
  if (adminParticipants.length === 0) return;

  const placeholders = adminParticipants
    .map((_, i) => {
      const b = i * 8;
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}::integer, $${b + 5}, $${b + 6}::integer, $${b + 7}::jsonb, $${b + 8}::integer)`;
    })
    .join(', ');

  const params = adminParticipants.flatMap((ap) => [
    ap.id,
    ap.name,
    ap.church,
    ap.score,
    ap.status,
    ap.tableNumber ?? null,
    JSON.stringify(ap.opponents ?? []),
    ap.matchesPlayed ?? 0,
  ]);

  await query(
    `INSERT INTO players (id, name, church, total_score, status, current_table, opponents, matches_played)
     VALUES ${placeholders}
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       church = EXCLUDED.church,
       total_score = EXCLUDED.total_score,
       status = EXCLUDED.status,
       current_table = EXCLUDED.current_table,
       opponents = EXCLUDED.opponents,
       matches_played = EXCLUDED.matches_played,
       updated_at = NOW()`,
    params
  );
}

export const MAX_PHASES = 5;
