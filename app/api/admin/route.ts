import { query, ensureMigrated } from '@/lib/db';
import { participants as seedParticipants } from '@/app/components/participants';
import { AdminParticipant } from '@/app/admin/types';

interface PlayerRow {
  id: string;
  name: string;
  church: string;
  total_score: number;
  status: string;
  current_table: number | null;
  opponents: string[];
  matches_played: number;
}

interface TournamentStateRow {
  phase: number;
  status: string;
  max_phases: number;
}

export async function GET() {
  await ensureMigrated();

  const [playerRows, stateRows] = await Promise.all([
    query<PlayerRow>('SELECT * FROM players ORDER BY total_score DESC'),
    query<TournamentStateRow>('SELECT phase, status, max_phases FROM tournament_state WHERE id = 1'),
  ]);

  const tournamentState = stateRows[0] ?? { phase: 1, status: 'waiting', max_phases: 5 };

  let participants: AdminParticipant[];

  if (playerRows.length === 0) {
    // Seed from static data on first load
    participants = seedParticipants.map((p, index) => ({
      id: `participant-${index}`,
      name: p.name,
      church: p.church,
      score: 0,
      matchesPlayed: 0,
      status: p.active ? ('active' as const) : ('eliminated' as const),
      opponents: [],
    }));
  } else {
    participants = playerRows.map((row) => ({
      id: row.id,
      name: row.name,
      church: row.church,
      score: row.total_score,
      matchesPlayed: row.matches_played,
      status: row.status as AdminParticipant['status'],
      tableNumber: row.current_table ?? undefined,
      opponents: row.opponents ?? [],
    }));
  }

  return Response.json({
    participants,
    tournamentState: {
      phase: tournamentState.phase,
      status: tournamentState.status,
      totalParticipants: participants.length,
      totalTables: Math.ceil(participants.filter((p) => p.status === 'active').length / 5),
      maxPhases: tournamentState.max_phases,
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { phase, status, maxPhases } = body;

  await query(
    `UPDATE tournament_state
     SET phase = $1, status = $2, max_phases = $3, updated_at = NOW()
     WHERE id = 1`,
    [phase, status, maxPhases]
  );

  return Response.json({ ok: true });
}
