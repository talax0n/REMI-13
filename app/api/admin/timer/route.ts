export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { query } from '@/lib/db';
import {
  clampTimerDuration,
  clampTimerKocokan,
  clampTimerPhase,
  getRemainingTimerSeconds,
  PersistedTimer,
  toTimerSnapshot,
} from '@/lib/timer';
import { REMI13_RULES } from '@/lib/tournament-config';

async function readTimer(): Promise<PersistedTimer> {
  const rows = await query<PersistedTimer>(
    `SELECT timer_status, timer_phase, timer_kocokan,
            timer_duration_seconds, timer_remaining_seconds, timer_started_at
       FROM tournament_state
      WHERE id = 1`
  );
  return rows[0] ?? {
    timer_status: 'idle',
    timer_phase: 1,
    timer_kocokan: 1,
    timer_duration_seconds: REMI13_RULES.defaultKocokanDurationSeconds,
    timer_remaining_seconds: REMI13_RULES.defaultKocokanDurationSeconds,
    timer_started_at: null,
  };
}

export async function POST(request: Request) {
  const body = await request.json();
  const action = body.action;
  const current = await readTimer();
  const currentSnapshot = toTimerSnapshot(current);
  const phase = clampTimerPhase(body.phase ?? current.timer_phase);
  const kocokan = clampTimerKocokan(body.kocokan ?? current.timer_kocokan);
  const durationSeconds = clampTimerDuration(
    body.durationSeconds ?? current.timer_duration_seconds
  );

  if (action === 'start') {
    const shouldReset = body.reset === true || currentSnapshot.status === 'finished';
    const remainingSeconds = shouldReset
      ? durationSeconds
      : currentSnapshot.remainingSeconds;

    await query(
      `UPDATE tournament_state
          SET timer_status = 'running',
              timer_phase = $1,
              timer_kocokan = $2,
              timer_duration_seconds = $3,
              timer_remaining_seconds = $4,
              timer_started_at = NOW(),
              updated_at = NOW()
        WHERE id = 1`,
      [phase, kocokan, durationSeconds, remainingSeconds]
    );
  } else if (action === 'pause') {
    const remainingSeconds = getRemainingTimerSeconds(currentSnapshot);
    await query(
      `UPDATE tournament_state
          SET timer_status = 'paused',
              timer_remaining_seconds = $1,
              timer_started_at = NULL,
              updated_at = NOW()
        WHERE id = 1`,
      [remainingSeconds]
    );
  } else if (action === 'set') {
    if (currentSnapshot.status === 'running') {
      return Response.json(
        { error: 'Pause atau reset timer dulu sebelum mengubah durasi' },
        { status: 400 }
      );
    }
    await query(
      `UPDATE tournament_state
          SET timer_phase = $1,
              timer_kocokan = $2,
              timer_duration_seconds = $3,
              timer_remaining_seconds = $3,
              updated_at = NOW()
        WHERE id = 1`,
      [phase, kocokan, durationSeconds]
    );
  } else if (action === 'reset') {
    await query(
      `UPDATE tournament_state
          SET timer_status = 'idle',
              timer_phase = $1,
              timer_kocokan = $2,
              timer_duration_seconds = $3,
              timer_remaining_seconds = $3,
              timer_started_at = NULL,
              updated_at = NOW()
        WHERE id = 1`,
      [phase, kocokan, durationSeconds]
    );
  } else {
    return Response.json({ error: 'Invalid timer action' }, { status: 400 });
  }

  return Response.json(toTimerSnapshot(await readTimer()));
}
