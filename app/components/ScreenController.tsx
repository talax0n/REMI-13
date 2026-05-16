"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, Maximize2, Minimize2 } from "lucide-react";
import LeaderboardScreen from "./LeaderboardScreen";
import TablesScreen from "./TablesScreen";
import { ScreenType, Player, Table } from "./types";
import { PlayerScore } from "../player/types";

function getDisplayScore(score: PlayerScore, currentPhase: number, semifinalPhase: number) {
  if (currentPhase < semifinalPhase) return score.totalScore;
  return score.scores?.[currentPhase]?.points ?? 0;
}

function convertToPlayers(
  scores: PlayerScore[],
  currentPhase: number,
  semifinalPhase: number,
  prevRanks: Map<string, number>,
): Player[] {
  const sortedScores = [...scores].sort((a, b) => {
    const scoreA = getDisplayScore(a, currentPhase, semifinalPhase);
    const scoreB = getDisplayScore(b, currentPhase, semifinalPhase);
    if (scoreB !== scoreA) return scoreB - scoreA;
    const tableA = a.currentTable ?? Number.MAX_SAFE_INTEGER;
    const tableB = b.currentTable ?? Number.MAX_SAFE_INTEGER;
    if (tableA !== tableB) return tableA - tableB;
    return a.name.localeCompare(b.name);
  });

  return sortedScores.map((p, index) => ({
    id: p.id,
    name: p.name,
    team: p.team,
    score: getDisplayScore(p, currentPhase, semifinalPhase),
    rank: index + 1,
    previousRank: prevRanks.get(p.id),
    status: p.status,
    currentTable: p.currentTable,
    currentPhaseScore: p.scores?.[currentPhase]?.points ?? 0,
  }));
}

export default function ScreenController() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("leaderboard");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [semifinalPhase, setSemifinalPhase] = useState(5);

  // Fetch current tournament phase on mount, then poll every 5s
  useEffect(() => {
    let cancelled = false;
    async function fetchPhase() {
      try {
        const res = await fetch("/api/admin");
        const data = await res.json();
        if (!cancelled && data.tournamentState?.phase) {
          setCurrentPhase(data.tournamentState.phase);
          setSemifinalPhase(data.tournamentState.semifinalPhase ?? 5);
        }
      } catch {
        // ignore
      }
    }
    fetchPhase();
    const interval = setInterval(fetchPhase, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Poll player scores. Avoid long-lived SSE DB polling; repeated display tabs can
  // exhaust small hosted Postgres session limits and leave the screen empty.
  useEffect(() => {
    let cancelled = false;
    async function fetchPlayers() {
      try {
        const res = await fetch("/api/player", { cache: "no-store" });
        if (!res.ok) return;
        const data: PlayerScore[] = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setPlayerScores(data);
        }
      } catch {
        // keep the last good snapshot visible
      }
    }
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Poll table updates with the same bounded request pattern.
  useEffect(() => {
    let cancelled = false;
    async function fetchTables() {
      try {
        const res = await fetch("/api/tables", { cache: "no-store" });
        if (!res.ok) return;
        const data: Table[] = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setTables(data);
        }
      } catch {
        // keep the last good snapshot visible
      }
    }
    fetchTables();
    const interval = setInterval(fetchTables, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const displayTables = tables;
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const players = useMemo(
    // Ref holds the prior poll's ranks so we can render previousRank diffs;
    // it is only updated from the effect below, not during render.
    // eslint-disable-next-line react-hooks/refs
    () => convertToPlayers(playerScores, currentPhase, semifinalPhase, prevRanksRef.current),
    [currentPhase, playerScores, semifinalPhase]
  );
  useEffect(() => {
    const next = new Map<string, number>();
    for (const p of players) next.set(p.id, p.rank);
    prevRanksRef.current = next;
  }, [players]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const navItems = [
    { id: "leaderboard" as ScreenType, label: "Leaderboard", icon: Trophy },
    { id: "tables" as ScreenType, label: "Tables", icon: Users },
  ];

  return (
    <div className="h-dvh flex flex-col bg-[#0a0a0b] relative">
      {/* Mobile top bar — centered logo + name */}
      <header className="sm:hidden h-14 flex items-center justify-center gap-2 px-4 border-b border-white/5 bg-[#0a0a0b] shrink-0">
        <img src="/LOGO.png" alt="Remi 13 Logo" className="w-7 h-7 rounded-lg object-contain shrink-0" />
        <span
          className="text-base font-bold text-white"
          style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
        >
          Remi 13 - DS Cileungsi
        </span>
      </header>

      {/* Desktop nav bar */}
      <nav className="hidden sm:flex h-16 items-center justify-between px-6 gap-2 border-b border-white/5 bg-[#0a0a0b] shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 min-w-0">
          <img src="/LOGO.png" alt="Remi 13 Logo" className="w-8 h-8 rounded-lg object-contain shrink-0" />
          <span
            className="text-lg font-bold text-white truncate"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            Remi 13 - DS Cileungsi
          </span>
        </div>

        {/* Nav Items */}
        <div className="flex items-center gap-1 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentScreen(item.id)}
                aria-label={item.label}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${
                    isActive
                      ? "bg-white text-black"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-sm shrink-0"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-4 h-4" />
              <span>Exit</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4" />
              <span>Fullscreen</span>
            </>
          )}
        </button>
      </nav>

      {/* Screen Content */}
      <main className="flex-1 overflow-y-auto sm:overflow-hidden pb-24 sm:pb-0">
        <AnimatePresence mode="wait">
          {currentScreen === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="min-h-full sm:h-full"
            >
              <LeaderboardScreen players={players} currentPhase={currentPhase} />
            </motion.div>
          )}
          {currentScreen === "tables" && (
            <motion.div
              key="tables"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="min-h-full sm:h-full"
            >
              <TablesScreen tables={displayTables} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile floating bottom nav */}
      <div
        className="sm:hidden fixed inset-x-0 z-50 px-4 pointer-events-none"
        style={{ bottom: `max(0.75rem, env(safe-area-inset-bottom))` }}
      >
        <div className="mx-auto w-fit pointer-events-auto flex items-center gap-1 p-1 rounded-full bg-zinc-900/90 backdrop-blur border border-white/10 shadow-lg shadow-black/40">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentScreen(item.id)}
                aria-label={item.label}
                className={`
                  flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-all
                  ${
                    isActive
                      ? "bg-white text-black"
                      : "text-zinc-300 hover:text-white active:bg-white/10"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
