export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { query } from '@/lib/db';
import {
  PersistedTimer,
  toTimerSnapshot,
} from '@/lib/timer';
import { REMI13_RULES } from '@/lib/tournament-config';

export async function GET() {
  const rows = await query<PersistedTimer>(
    `SELECT timer_status, timer_phase, timer_kocokan,
            timer_duration_seconds, timer_remaining_seconds, timer_started_at
       FROM tournament_state
      WHERE id = 1`
  );

  const row = rows[0] ?? {
    timer_status: 'idle',
    timer_phase: 1,
    timer_kocokan: 1,
    timer_duration_seconds: REMI13_RULES.defaultKocokanDurationSeconds,
    timer_remaining_seconds: REMI13_RULES.defaultKocokanDurationSeconds,
    timer_started_at: null,
  };

  return Response.json(toTimerSnapshot(row));
}
