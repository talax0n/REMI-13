'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Minimize2, Play } from 'lucide-react';
import { getRemainingTimerSeconds, TimerSnapshot } from '@/lib/timer';
import { REMI13_RULES } from '@/lib/tournament-config';
import { SuitPip } from './suit-pip';

const RING_RADIUS = 46;
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

function timerKey(timer: TimerSnapshot | null): string | null {
  if (!timer) return null;
  return `${timer.phase}-${timer.kocokan}-${timer.startedAt ?? ''}`;
}

// Every fresh "start" (a new phase/kocokan/startedAt combination) takes over
// the whole screen once, so the room notices a round just began. Whoever is
// minding the display can dismiss it to get back to the live leaderboard or
// tables underneath — the compact timer bar keeps running there regardless.
export default function MaximizedTimerOverlay({ timer }: { timer: TimerSnapshot | null }) {
  const [remaining, setRemaining] = useState(() => getSynchronizedRemaining(timer));
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const tick = () => setRemaining(getSynchronizedRemaining(timer));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [timer]);

  const key = timerKey(timer);
  const isRunning = timer?.status === 'running' && remaining > 0;
  const visible = Boolean(isRunning && key && key !== dismissedKey);

  const isUrgent = isRunning && remaining <= 60;
  const fraction = timer && timer.durationSeconds > 0 ? Math.min(1, Math.max(0, remaining / timer.durationSeconds)) : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - fraction);

  return (
    <AnimatePresence>
      {visible && timer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.25, ease: [0, 0, 0.2, 1] }}
          role="status"
          aria-label="Timer sedang berjalan"
          className={`fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[#0a0a0b] ${
            isUrgent ? 'bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.14),transparent_60%)]' : ''
          }`}
        >
          <button
            type="button"
            onClick={() => key && setDismissedKey(key)}
            className="absolute right-4 top-4 inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b] sm:right-6 sm:top-6"
          >
            <Minimize2 className="h-4 w-4" />
            Tutup
          </button>

          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            <SuitPip index={timer.kocokan - 1} className="text-sm leading-none" />
            Babak {timer.phase} · Kocokan {timer.kocokan}/{REMI13_RULES.shufflesPerPhase}
          </span>

          <div className="relative mt-8 flex h-56 w-56 items-center justify-center sm:h-72 sm:w-72">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
              <circle cx="50" cy="50" r={RING_RADIUS} className="fill-none stroke-white/[0.08]" strokeWidth="4" />
              <circle
                cx="50"
                cy="50"
                r={RING_RADIUS}
                strokeWidth="4"
                strokeLinecap="round"
                className={`fill-none ${isUrgent ? 'stroke-rose-400' : 'stroke-amber-300'} ${
                  reduceMotion ? '' : 'transition-[stroke-dashoffset] duration-1000 ease-linear'
                }`}
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div
              className={`font-[family-name:var(--font-space-grotesk)] text-6xl font-black tabular-nums tracking-tight sm:text-7xl ${
                isUrgent ? 'text-rose-200' : 'text-white'
              }`}
            >
              {formatTime(remaining)}
            </div>
          </div>

          <p className={`mt-6 flex items-center gap-1.5 text-sm font-medium ${isUrgent ? 'text-rose-200' : 'text-amber-200/80'}`}>
            <Play className="h-3.5 w-3.5" /> Sedang berjalan
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
