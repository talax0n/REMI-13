'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Pause, Play, RotateCcw, SkipForward, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getRemainingTimerSeconds, TimerSnapshot } from '@/lib/timer';
import { REMI13_RULES } from '@/lib/tournament-config';
import { SuitPip } from '../../components/suit-pip';

interface TimerControlProps {
  currentPhase: number;
}

const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const seconds = Math.max(0, totalSeconds) % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function TimerControl({ currentPhase }: TimerControlProps) {
  const [timer, setTimer] = useState<TimerSnapshot | null>(null);
  const [durationMinutes, setDurationMinutes] = useState('15');
  const [now, setNow] = useState(() => Date.now());
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const timerRef = useRef<TimerSnapshot | null>(timer);
  const digitRef = useRef<HTMLParagraphElement>(null);
  const [initialDisplay] = useState(() => formatTime(timer ? getRemainingTimerSeconds(timer) : 0));
  const durationInitialized = useRef(false);

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  const fetchTimer = useCallback(async () => {
    try {
      const response = await fetch('/api/timer', { cache: 'no-store' });
      if (!response.ok) return;
      const data: TimerSnapshot = await response.json();
      setTimer(data);
      if (!durationInitialized.current) {
        setDurationMinutes(String(Math.max(1, Math.round(data.durationSeconds / 60))));
        durationInitialized.current = true;
      }
    } catch {
      // keep the current control state visible
    }
  }, []);

  useEffect(() => {
    fetchTimer();
    const poll = window.setInterval(fetchTimer, 1000);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [fetchTimer]);

  useEffect(() => {
    let frame = 0;
    let lastRemaining = -1;

    const tick = () => {
      const remaining = timerRef.current
        ? getRemainingTimerSeconds(
            timerRef.current,
            Date.now() + (Date.parse(timerRef.current.serverNow) - Date.now()),
          )
        : 0;

      if (remaining !== lastRemaining) {
        lastRemaining = remaining;
        if (digitRef.current) digitRef.current.textContent = formatTime(remaining);
      }
      frame = window.requestAnimationFrame(tick);
    };

    tick();
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const isSaving = savingAction !== null;

  const sendAction = async (
    action: 'start' | 'pause' | 'reset' | 'set',
    extra: Record<string, unknown> = {},
  ) => {
    const minutes = Number(durationMinutes);
    const durationSeconds = Number.isFinite(minutes) ? Math.max(1, Math.floor(minutes)) * 60 : 900;
    setSavingAction(action);
    try {
      const response = await fetch('/api/admin/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          phase: timer?.phase ?? currentPhase,
          kocokan: timer?.kocokan ?? 1,
          durationSeconds,
          ...extra,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? 'Timer update failed');
      setTimer(payload);
      if (action === 'set') toast.success('Durasi kocokan diperbarui');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Timer tidak dapat diperbarui');
    } finally {
      setSavingAction(null);
    }
  };

  const remaining = timer
    ? getRemainingTimerSeconds(timer, now + (Date.parse(timer.serverNow) - now))
    : 0;
  const isRunning = timer?.status === 'running' && remaining > 0;
  const isUrgent = isRunning && remaining <= 60;
  const isFinished = timer?.status === 'finished' || (timer?.status === 'running' && remaining === 0);
  const isPaused = timer?.status === 'paused';

  const statusLabel = isFinished ? 'Finished' : isRunning ? 'Running' : isPaused ? 'Paused' : 'Ready';
  const statusClass = isFinished
    ? 'bg-emerald-400/15 text-emerald-300'
    : isUrgent
      ? 'bg-rose-400/15 text-rose-300'
      : isRunning
        ? 'bg-amber-400/15 text-amber-200'
        : 'bg-white/[0.07] text-zinc-400';

  const fraction = timer && timer.durationSeconds > 0 ? Math.min(1, Math.max(0, remaining / timer.durationSeconds)) : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - fraction);
  const ringColor = isFinished ? 'stroke-emerald-400' : isUrgent ? 'stroke-rose-400' : isRunning ? 'stroke-amber-300' : 'stroke-zinc-700';

  const nextKocokan = () => {
    if (!timer || timer.kocokan >= REMI13_RULES.shufflesPerPhase) {
      toast.info('Babak ini sudah berada di kocokan terakhir');
      return;
    }
    sendAction('start', { kocokan: timer.kocokan + 1, reset: true });
  };

  const resetToFirstKocokan = () => {
    if (!timer || timer.kocokan === 1) return;
    const confirmed = window.confirm(
      `Reset Babak ${timer.phase} dari Kocokan ${timer.kocokan} ke Kocokan 1? Timer akan berhenti dan durasi kembali penuh.`,
    );
    if (!confirmed) return;
    sendAction('reset', { kocokan: 1 });
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <Timer className="h-4 w-4 text-amber-300" /> Timer kocokan
          </p>
          <p className="mt-1 text-xs text-zinc-500">Timer tersinkron ke Leaderboard dan Tables</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="mb-3 flex min-w-0 flex-col gap-3 rounded-lg border border-white/[0.07] bg-zinc-950/30 px-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg viewBox="0 0 64 64" className="absolute inset-0 h-16 w-16 -rotate-90">
              <circle cx="32" cy="32" r={RING_RADIUS} className="fill-none stroke-white/[0.08]" strokeWidth="3" />
              <circle
                cx="32"
                cy="32"
                r={RING_RADIUS}
                strokeWidth="3"
                strokeLinecap="round"
                className={`fill-none ${ringColor} transition-[stroke-dashoffset] duration-1000 ease-linear`}
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={isFinished ? 0 : dashOffset}
              />
            </svg>
            <span className="font-[family-name:var(--font-space-grotesk)] text-[10px] font-black tabular-nums text-zinc-400">
              {timer ? Math.round(fraction * 100) : 0}%
            </span>
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
              <SuitPip index={(timer?.kocokan ?? 1) - 1} className="text-xs leading-none" />
              Babak {currentPhase} · Kocokan {timer?.kocokan ?? 1}/{REMI13_RULES.shufflesPerPhase}
            </p>
            <p ref={digitRef} className="font-[family-name:var(--font-space-grotesk)] text-4xl font-black tabular-nums text-white">
              {initialDisplay}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => sendAction('start', { reset: false })}
            disabled={isRunning || isSaving}
            className="h-10 border-white/10 text-white hover:bg-white/10"
            aria-label="Start timer"
          >
            <Play className="mr-1.5 h-3.5 w-3.5" /> Start
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => sendAction('pause')}
            disabled={!isRunning || isSaving}
            className="h-10 border-white/10 text-white hover:bg-white/10"
            aria-label="Pause timer"
          >
            <Pause className="mr-1.5 h-3.5 w-3.5" /> Pause
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => sendAction('reset')}
            disabled={isSaving}
            className="h-10 border-white/10 text-white hover:bg-white/10"
            aria-label="Reset kocokan"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-zinc-500">
          Durasi tiap kocokan (menit)
          <Input
            type="number"
            min={1}
            max={120}
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(event.target.value)}
            className="mt-1 h-9 w-full border-white/10 bg-zinc-950/30 text-white"
          />
        </label>
        <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => sendAction('set')}
          disabled={isRunning || isSaving}
          title={isRunning ? 'Pause atau reset timer dulu untuk mengubah durasi' : undefined}
          className="h-9 shrink-0 border-white/10 text-white hover:bg-white/10 disabled:opacity-40"
        >
          <Check className="mr-1.5 h-3.5 w-3.5" /> Set
        </Button>
        <Button
          type="button"
          onClick={nextKocokan}
          disabled={!timer || timer.kocokan >= REMI13_RULES.shufflesPerPhase || isSaving}
          className="h-9 flex-1 bg-amber-500 text-amber-950 hover:bg-amber-400 disabled:opacity-40"
        >
          <SkipForward className="mr-1.5 h-4 w-4" /> Next &amp; Start
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={resetToFirstKocokan}
          disabled={!timer || timer.kocokan === 1 || isSaving}
          className="h-9 shrink-0 border-rose-400/25 text-rose-200 hover:bg-rose-400/10 disabled:opacity-40"
        >
          Reset ke 1/6
        </Button>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-zinc-500">
        Set menyimpan durasi tanpa menjalankan timer. Next &amp; Start memakai durasi di atas, pindah ke kocokan
        berikutnya, lalu langsung menjalankan timer.
      </p>
    </section>
  );
}
