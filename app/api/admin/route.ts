export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { query, ensureMigrated } from '@/lib/db';
import { AdminParticipant } from '@/app/admin/types';

interface PlayerRow {
  id: string;
  name: string;
  team: string;
  total_score: number;
  status: string;
  current_table: number | null;
  scores: Record<string, { points: number }>;
  opponents: string[];
  matches_played: number;
}

interface TournamentStateRow {
  phase: number;
  status: string;
  max_phases: number;
  semifinal_cutoff: number;
  final_cutoff: number;
}

function normalizeSemifinalCutoff(value: unknown): 10 | 20 {
  return value === 10 ? 10 : 20;
}

function normalizeFinalCutoff(value: unknown): 5 | 10 {
  return value === 5 ? 5 : 10;
}

export async function GET() {
  await ensureMigrated();

  const [playerRows, stateRows] = await Promise.all([
    query<PlayerRow>('SELECT * FROM players ORDER BY total_score DESC'),
    query<TournamentStateRow>(
      'SELECT phase, status, max_phases, semifinal_cutoff, final_cutoff FROM tournament_state WHERE id = 1'
    ),
  ]);

  const tournamentState = stateRows[0] ?? {
    phase: 1,
    status: 'in_progress',
    max_phases: 6,
    semifinal_cutoff: 20,
    final_cutoff: 10,
  };

  const participants: AdminParticipant[] = playerRows.map((row) => ({
    id: row.id,
    name: row.name,
    team: row.team,
    score: row.total_score,
    matchesPlayed: row.matches_played,
    status: row.status as AdminParticipant['status'],
    tableNumber: row.current_table ?? undefined,
    opponents: row.opponents ?? [],
  }));
  const phaseScores = Object.fromEntries(
    playerRows.map((row) => [
      row.id,
      Object.fromEntries(
        Object.entries(row.scores ?? {}).map(([phase, score]) => [
          Number(phase),
          score.points ?? 0,
        ])
      ),
    ])
  );

  const activeCount = participants.filter((p) => p.status === 'active').length;
  return Response.json({
    participants,
    phaseScores,
    tournamentState: {
      phase: tournamentState.phase,
      status: tournamentState.status,
      totalParticipants: activeCount,
      totalTables: Math.ceil(activeCount / 5),
      maxPhases: tournamentState.max_phases,
      isFinalPhase: tournamentState.phase >= tournamentState.max_phases,
      semifinalCutoff: normalizeSemifinalCutoff(tournamentState.semifinal_cutoff),
      finalCutoff: normalizeFinalCutoff(tournamentState.final_cutoff),
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (body.action === 'resetDatabase') {
    await Promise.all([
      query('DELETE FROM players'),
      query('DELETE FROM game_tables'),
      query(
        `UPDATE tournament_state
         SET phase = 1, status = 'waiting', max_phases = 6, updated_at = NOW()
         WHERE id = 1`
      ),
    ]);

    return Response.json({
      ok: true,
      participants: [],
      tournamentState: {
        phase: 1,
        status: 'waiting',
        totalParticipants: 0,
        totalTables: 0,
        maxPhases: 6,
        isFinalPhase: false,
        semifinalCutoff: 20,
        finalCutoff: 10,
      },
    });
  }

  const { phase, status, maxPhases, semifinalCutoff, finalCutoff } = body;

  await query(
    `UPDATE tournament_state
     SET phase = $1,
         status = $2,
         max_phases = $3,
         semifinal_cutoff = $4,
         final_cutoff = $5,
         updated_at = NOW()
     WHERE id = 1`,
    [
      phase,
      status,
      maxPhases,
      normalizeSemifinalCutoff(semifinalCutoff),
      normalizeFinalCutoff(finalCutoff),
    ]
  );

  return Response.json({ ok: true });
}
