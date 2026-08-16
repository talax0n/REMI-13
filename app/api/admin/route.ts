export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { query, ensureMigrated } from '@/lib/db';
import { AdminParticipant } from '@/app/admin/types';
import { LEGACY_SEMIFINAL_PHASE, REMI13_RULES } from '@/lib/tournament-config';

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
  semifinal_phase: number;
  final_phase: number;
  final_wildcard_ids: string[];
}

function normalizePhase(value: unknown): number {
  const phase = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(phase)) return 1;
  return Math.min(REMI13_RULES.totalPhases, Math.max(1, Math.floor(phase)));
}

export async function GET() {
  await ensureMigrated();

  const [playerRows, stateRows] = await Promise.all([
    query<PlayerRow>('SELECT * FROM players ORDER BY total_score DESC'),
    query<TournamentStateRow>(
      'SELECT phase, status, max_phases, semifinal_cutoff, final_cutoff, semifinal_phase, final_phase, final_wildcard_ids FROM tournament_state WHERE id = 1'
    ),
  ]);

  const tournamentState = stateRows[0] ?? {
    phase: 1,
    status: 'in_progress',
    max_phases: REMI13_RULES.totalPhases,
    semifinal_cutoff: 20,
    final_cutoff: 10,
    semifinal_phase: LEGACY_SEMIFINAL_PHASE,
    final_phase: REMI13_RULES.totalPhases,
    final_wildcard_ids: [],
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
  const currentPhase = normalizePhase(tournamentState.phase);
  return Response.json({
    participants,
    phaseScores,
    tournamentState: {
      phase: currentPhase,
      status: tournamentState.status,
      totalParticipants: activeCount,
      totalTables: Math.ceil(activeCount / REMI13_RULES.tableSize),
      maxPhases: REMI13_RULES.totalPhases,
      shufflesPerPhase: REMI13_RULES.shufflesPerPhase,
      targetParticipants: REMI13_RULES.targetParticipants,
      tableSize: REMI13_RULES.tableSize,
      semifinalPhase: LEGACY_SEMIFINAL_PHASE,
      finalPhase: REMI13_RULES.totalPhases,
      isFinalPhase: currentPhase >= REMI13_RULES.totalPhases,
      semifinalCutoff: 20,
      finalCutoff: REMI13_RULES.individualWinners,
      finalWildcardIds: [],
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
         SET phase = 1,
             status = 'waiting',
             max_phases = $1,
             semifinal_phase = $2,
             final_phase = $3,
             timer_status = 'idle',
             timer_phase = 1,
             timer_kocokan = 1,
             timer_duration_seconds = $4,
             timer_remaining_seconds = $4,
             timer_started_at = NULL,
             final_wildcard_ids = '[]'::jsonb,
             updated_at = NOW()
         WHERE id = 1`,
        [
          REMI13_RULES.totalPhases,
          LEGACY_SEMIFINAL_PHASE,
          REMI13_RULES.totalPhases,
          REMI13_RULES.defaultKocokanDurationSeconds,
        ]
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
        maxPhases: REMI13_RULES.totalPhases,
        shufflesPerPhase: REMI13_RULES.shufflesPerPhase,
        targetParticipants: REMI13_RULES.targetParticipants,
        tableSize: REMI13_RULES.tableSize,
        semifinalPhase: LEGACY_SEMIFINAL_PHASE,
        finalPhase: REMI13_RULES.totalPhases,
        isFinalPhase: false,
        semifinalCutoff: 20,
        finalCutoff: REMI13_RULES.individualWinners,
        finalWildcardIds: [],
      },
    });
  }

  const phase = normalizePhase(body.phase);
  const status = body.status === 'completed' ? 'completed' : body.status === 'in_progress' ? 'in_progress' : 'waiting';

  await query(
    `UPDATE tournament_state
     SET phase = $1,
         status = $2,
         max_phases = $3,
         semifinal_cutoff = $4,
         final_cutoff = $5,
         semifinal_phase = $6,
         final_phase = $7,
         final_wildcard_ids = $8::jsonb,
         updated_at = NOW()
     WHERE id = 1`,
    [
      phase,
      status,
      REMI13_RULES.totalPhases,
      20,
      REMI13_RULES.individualWinners,
      LEGACY_SEMIFINAL_PHASE,
      REMI13_RULES.totalPhases,
      JSON.stringify([]),
    ]
  );

  return Response.json({ ok: true });
}
