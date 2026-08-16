'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { CheckCircle2, Pause, Play, TimerReset } from 'lucide-react';
import { getRemainingTimerSeconds, TimerSnapshot } from '@/lib/timer';
import { REMI13_RULES } from '@/lib/tournament-config';
import { SuitPip } from './suit-pip';

const RING_RADIUS = 15;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatTime(totalSeconds: number): string {
  const seconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function getSynchronizedRemaining(timer: TimerSnapshot | null): number {
  if (!timer) return 0;
  const serverOffset = Date.parse(timer.serverNow) - Date.now();
  return getRemainingTimerSeconds(timer, Date.now() + serverOffset);
}

export default function TournamentTimer({ timer }: { timer: TimerSnapshot | null }) {
  const [remaining, setRemaining] = useState(() => getSynchronizedRemaining(timer));
  const timerRef = useRef<TimerSnapshot | null>(timer);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // Keep the ticker aligned with the latest server snapshot without
    // recreating the one-second interval whenever the parent polls.
    timerRef.current = timer;
  }, [timer]);

  useEffect(() => {
    let timeout: number | undefined;

    // Schedule against the next wall-clock second. This keeps the visible
    // countdown at one-second boundaries even though server snapshots arrive
    // less often and avoids accumulating interval drift.
    const tick = () => {
      setRemaining(getSynchronizedRemaining(timerRef.current));
      const delay = 1000 - (Date.now() % 1000);
      timeout = window.setTimeout(tick, delay);
    };

    tick();
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, []);

  if (!timer) {
    return (
      <section className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-zinc-900/60 px-3 py-2.5 opacity-70">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <TimerReset className="h-4 w-4" /> Timer siap dimuat
        </div>
        <span className="font-mono text-sm text-zinc-600">--:--</span>
      </section>
    );
  }

  const isRunning = timer.status === 'running' && remaining > 0;
  const isUrgent = isRunning && remaining <= 60;
  const isFinished = timer.status === 'finished' || (timer.status === 'running' && remaining === 0);
  const isPaused = timer.status === 'paused';
  const Icon = isFinished ? CheckCircle2 : isRunning ? Play : isPaused ? Pause : TimerReset;
  const statusLabel = isFinished ? 'Waktu habis' : isRunning ? 'Sedang berjalan' : isPaused ? 'Paused' : 'Belum dimulai';

  const fraction = timer.durationSeconds > 0 ? Math.min(1, Math.max(0, remaining / timer.durationSeconds)) : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - fraction);
  const ringColor = isUrgent
    ? 'stroke-rose-400'
    : isRunning
      ? 'stroke-amber-300'
      : isFinished
        ? 'stroke-emerald-400'
        : 'stroke-zinc-700';

  return (
    <>
      <section
        aria-label="Tournament timer"
        className={`mb-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors sm:px-4 ${
          isUrgent
            ? 'border-rose-400/40 bg-rose-500/[0.12] shadow-lg shadow-rose-500/10'
            : isRunning
              ? 'border-amber-300/25 bg-amber-400/[0.06]'
              : isFinished
                ? 'border-emerald-400/25 bg-emerald-400/[0.06]'
                : 'border-white/[0.07] bg-zinc-900/60'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center sm:h-12 sm:w-12">
            <svg viewBox="0 0 36 36" className="absolute inset-0 h-11 w-11 -rotate-90 sm:h-12 sm:w-12">
              <circle cx="18" cy="18" r={RING_RADIUS} className="fill-none stroke-white/[0.08]" strokeWidth="2.5" />
              <circle
                cx="18"
                cy="18"
                r={RING_RADIUS}
                strokeWidth="2.5"
                strokeLinecap="round"
                className={`fill-none ${ringColor} ${reduceMotion ? '' : 'transition-[stroke-dashoffset] duration-1000 ease-linear'}`}
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={isFinished ? 0 : dashOffset}
              />
            </svg>
            <Icon className={`h-4 w-4 sm:h-[18px] sm:w-[18px] ${isUrgent ? 'text-rose-300' : isRunning ? 'text-amber-200' : isFinished ? 'text-emerald-300' : 'text-zinc-400'}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold uppercase tracking-wider text-white sm:text-base">Babak {timer.phase}</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-1.5 py-0.5 text-[11px] text-zinc-400">
                <SuitPip index={timer.kocokan - 1} className="text-xs leading-none" />
                Kocokan {timer.kocokan}/{REMI13_RULES.shufflesPerPhase}
              </span>
            </div>
            <p className={`text-xs ${isUrgent ? 'text-rose-200' : isRunning ? 'text-amber-200/70' : 'text-zinc-500'}`}>{statusLabel}</p>
          </div>
        </div>
        <div
          className={`shrink-0 font-[family-name:var(--font-space-grotesk)] text-3xl font-black leading-none tracking-tight tabular-nums sm:text-4xl ${
            isUrgent ? 'text-rose-200' : isRunning ? 'text-white' : 'text-zinc-300'
          }`}
        >
          {formatTime(remaining)}
        </div>
      </section>

      {isFinished && (
        <TimesUpCard
          key={`${timer.phase}-${timer.kocokan}`}
          kocokan={timer.kocokan}
          reduceMotion={!!reduceMotion}
        />
      )}
    </>
  );
}

function TimesUpCard({ reduceMotion }: { kocokan: number; reduceMotion: boolean }) {
  return (
    <div
      aria-label="Time's up"
      aria-live="assertive"
      role="alertdialog"
      className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center p-6"
    >
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduceMotion ? 0.15 : 0.4, ease: [0, 0, 0.2, 1] }}
        className="flex flex-col items-center text-center"
      >
        <div className="h-48 w-48 sm:h-64 sm:w-64">
          <DotLottieReact
            src="https://lottie.host/55a98f79-ea06-4307-857b-748cbb29e075/RGCSR8kp1V.lottie"
            loop
            autoplay
            className="h-full w-full"
          />
        </div>
        <h2 className="font-[family-name:var(--font-space-grotesk)] text-4xl font-black tracking-tight text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.85)] sm:text-5xl">
          Time&apos;s up
        </h2>
      </motion.div>
    </div>
  );
}
