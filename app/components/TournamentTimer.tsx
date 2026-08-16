'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { CheckCircle2, Maximize2, Pause, Play, TimerReset } from 'lucide-react';
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

interface Phase {
  isRunning: boolean;
  isUrgent: boolean;
  isFinished: boolean;
  isPaused: boolean;
}

function derivePhase(timer: TimerSnapshot | null, remaining: number): Phase {
  const isRunning = timer?.status === 'running' && remaining > 0;
  return {
    isRunning,
    isUrgent: isRunning && remaining <= 60,
    isFinished: timer?.status === 'finished' || (timer?.status === 'running' && remaining === 0),
    isPaused: timer?.status === 'paused',
  };
}

function samePhase(a: Phase, b: Phase) {
  return a.isRunning === b.isRunning && a.isUrgent === b.isUrgent && a.isFinished === b.isFinished && a.isPaused === b.isPaused;
}

export default function TournamentTimer({
  timer,
  onExpand,
}: {
  timer: TimerSnapshot | null;
  onExpand?: () => void;
}) {
  const timerRef = useRef<TimerSnapshot | null>(timer);
  const digitRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const initialPhase = derivePhase(timer, getSynchronizedRemaining(timer));
  const phaseRef = useRef<Phase>(initialPhase);
  const reduceMotion = useReducedMotion();
  const [initialDisplay] = useState(() => formatTime(getSynchronizedRemaining(timer)));
  const [initialDashOffset] = useState(() => {
    const remaining = getSynchronizedRemaining(timer);
    const fraction = timer && timer.durationSeconds > 0 ? Math.min(1, Math.max(0, remaining / timer.durationSeconds)) : 0;
    return RING_CIRCUMFERENCE * (1 - fraction);
  });
  const [phase, setPhase] = useState<Phase>(() => initialPhase);

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  useEffect(() => {
    // The countdown text and ring are written straight to the DOM, bypassing
    // React state/render entirely for the hot path. The absolute timestamp is
    // checked each animation frame, so a 5-second API poll can never become
    // the display cadence.
    let frame = 0;
    let lastRemaining = -1;

    const tick = () => {
      const current = timerRef.current;
      const remaining = getSynchronizedRemaining(current);

      if (remaining !== lastRemaining) {
        lastRemaining = remaining;
        if (digitRef.current) digitRef.current.textContent = formatTime(remaining);
        if (ringRef.current) {
          const fraction = current && current.durationSeconds > 0 ? Math.min(1, Math.max(0, remaining / current.durationSeconds)) : 0;
          ringRef.current.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - fraction));
        }
      }

      const next = derivePhase(current, remaining);
      if (!samePhase(phaseRef.current, next)) {
        phaseRef.current = next;
        setPhase(next);
      }
      frame = window.requestAnimationFrame(tick);
    };

    tick();
    return () => window.cancelAnimationFrame(frame);
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

  const { isRunning, isUrgent, isFinished, isPaused } = phase;
  const Icon = isFinished ? CheckCircle2 : isRunning ? Play : isPaused ? Pause : TimerReset;
  const statusLabel = isFinished ? 'Waktu habis' : isRunning ? 'Sedang berjalan' : isPaused ? 'Paused' : 'Belum dimulai';
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
                ref={ringRef}
                cx="18"
                cy="18"
                r={RING_RADIUS}
                strokeWidth="2.5"
                strokeLinecap="round"
                className={`fill-none ${ringColor} ${reduceMotion ? '' : 'transition-[stroke-dashoffset] duration-1000 ease-linear'}`}
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={initialDashOffset}
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
          ref={digitRef}
          className={`shrink-0 font-[family-name:var(--font-space-grotesk)] text-3xl font-black leading-none tracking-tight tabular-nums sm:text-4xl ${
            isUrgent ? 'text-rose-200' : isRunning ? 'text-white' : 'text-zinc-300'
          }`}
        >
          {initialDisplay}
        </div>
        {onExpand && (isRunning || isPaused) && (
          <button
            type="button"
            onClick={onExpand}
            aria-label="Perbesar timer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b]"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </section>

      {isFinished && (
        <TimesUpCard key={`${timer.phase}-${timer.kocokan}`} reduceMotion={!!reduceMotion} />
      )}
    </>
  );
}

function TimesUpCard({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div
      aria-label="Time's up"
      aria-live="assertive"
      role="alertdialog"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#09090b]/80 p-6 backdrop-blur-sm"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.16),transparent_60%)]" />
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduceMotion ? 0.15 : 0.4, ease: [0, 0, 0.2, 1] }}
        className="relative flex flex-col items-center text-center"
      >
        <div className="h-48 w-48 sm:h-64 sm:w-64">
          <DotLottieReact
            src="https://lottie.host/55a98f79-ea06-4307-857b-748cbb29e075/RGCSR8kp1V.lottie"
            loop
            autoplay
            className="h-full w-full"
          />
        </div>
        <h2 className="font-[family-name:var(--font-space-grotesk)] text-4xl font-black tracking-tight text-white sm:text-5xl">
          Waktu Habis
        </h2>
      </motion.div>
    </div>
  );
}
