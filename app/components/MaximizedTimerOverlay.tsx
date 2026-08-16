'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Minimize2, Pause, Play } from 'lucide-react';
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

// Takes over the whole screen whenever the parent says to (a fresh start, or
// the viewer manually re-opening it after closing). Whoever is minding the
// display can close it to get back to the live leaderboard or tables
// underneath — the compact timer bar keeps running there regardless, and
// still has its own "maximize" button to bring this back.
export default function MaximizedTimerOverlay({
  timer,
  visible,
  onClose,
}: {
  timer: TimerSnapshot | null;
  visible: boolean;
  onClose: () => void;
}) {
  const timerRef = useRef<TimerSnapshot | null>(timer);
  const digitRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const urgentRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const [initialDisplay] = useState(() => formatTime(getSynchronizedRemaining(timer)));
  const [initialDashOffset] = useState(() => {
    const remaining = getSynchronizedRemaining(timer);
    const fraction = timer && timer.durationSeconds > 0 ? Math.min(1, Math.max(0, remaining / timer.durationSeconds)) : 0;
    return RING_CIRCUMFERENCE * (1 - fraction);
  });

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  useEffect(() => {
    // Write the digits and ring straight to the DOM instead of through React.
    // The clock is derived from the absolute timestamp on every animation
    // frame; API polling only replaces the base snapshot.
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

      const nextUrgent = current?.status === 'running' && remaining > 0 && remaining <= 60;
      if (urgentRef.current !== nextUrgent) {
        urgentRef.current = nextUrgent;
        setIsUrgent(nextUrgent);
      }
      frame = window.requestAnimationFrame(tick);
    };

    tick();
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const canShow = Boolean(timer && (timer.status === 'running' || timer.status === 'paused'));
  const shown = visible && canShow;

  return (
    <AnimatePresence>
      {shown && timer && (
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
            onClick={onClose}
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
                ref={ringRef}
                cx="50"
                cy="50"
                r={RING_RADIUS}
                strokeWidth="4"
                strokeLinecap="round"
                className={`fill-none ${isUrgent ? 'stroke-rose-400' : 'stroke-amber-300'} ${
                  reduceMotion ? '' : 'transition-[stroke-dashoffset] duration-1000 ease-linear'
                }`}
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={initialDashOffset}
              />
            </svg>
            <div
              ref={digitRef}
              className={`font-[family-name:var(--font-space-grotesk)] text-6xl font-black tabular-nums tracking-tight sm:text-7xl ${
                isUrgent ? 'text-rose-200' : 'text-white'
              }`}
            >
              {initialDisplay}
            </div>
          </div>

          <p className={`mt-6 flex items-center gap-1.5 text-sm font-medium ${isUrgent ? 'text-rose-200' : 'text-amber-200/80'}`}>
            {timer.status === 'paused' ? (
              <>
                <Pause className="h-3.5 w-3.5" /> Dijeda
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Sedang berjalan
              </>
            )}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
