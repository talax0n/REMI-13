import { REMI13_RULES } from './tournament-config';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface TimerSnapshot {
  status: TimerStatus;
  phase: number;
  kocokan: number;
  durationSeconds: number;
  remainingSeconds: number;
  startedAt: string | null;
  serverNow: string;
}

export interface PersistedTimer {
  timer_status: string;
  timer_phase: number;
  timer_kocokan: number;
  timer_duration_seconds: number;
  timer_remaining_seconds: number;
  timer_started_at: Date | string | null;
}

export function clampTimerDuration(value: unknown): number {
  const seconds = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(seconds)) return REMI13_RULES.defaultKocokanDurationSeconds;
  return Math.min(2 * 60 * 60, Math.max(60, Math.floor(seconds)));
}

export function clampTimerPhase(value: unknown): number {
  const phase = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(phase)) return 1;
  return Math.min(REMI13_RULES.totalPhases, Math.max(1, Math.floor(phase)));
}

export function clampTimerKocokan(value: unknown): number {
  const kocokan = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(kocokan)) return 1;
  return Math.min(REMI13_RULES.shufflesPerPhase, Math.max(1, Math.floor(kocokan)));
}

export function getRemainingTimerSeconds(
  timer: Pick<TimerSnapshot, 'status' | 'remainingSeconds' | 'startedAt'>,
  now = Date.now(),
): number {
  if (timer.status !== 'running' || !timer.startedAt) {
    return Math.max(0, Math.floor(timer.remainingSeconds));
  }

  const startedAt = Date.parse(timer.startedAt);
  if (!Number.isFinite(startedAt)) return Math.max(0, Math.floor(timer.remainingSeconds));
  return Math.max(0, Math.floor(timer.remainingSeconds - (now - startedAt) / 1000));
}

export function toTimerSnapshot(row: PersistedTimer): TimerSnapshot {
  const status: TimerStatus =
    row.timer_status === 'running' || row.timer_status === 'paused' || row.timer_status === 'finished'
      ? row.timer_status
      : 'idle';
  const startedAt = row.timer_started_at ? new Date(row.timer_started_at).toISOString() : null;
  const base = {
    status,
    phase: clampTimerPhase(row.timer_phase),
    kocokan: clampTimerKocokan(row.timer_kocokan),
    durationSeconds: clampTimerDuration(row.timer_duration_seconds),
    remainingSeconds: Math.max(0, Math.floor(row.timer_remaining_seconds)),
    startedAt,
  };
  const remainingSeconds = getRemainingTimerSeconds(base);
  const isFinished = status === 'running' && remainingSeconds <= 0;

  return {
    ...base,
    status: isFinished ? 'finished' : status,
    remainingSeconds: isFinished ? 0 : base.remainingSeconds,
    startedAt: isFinished ? null : startedAt,
    serverNow: new Date().toISOString(),
  };
}
