"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, Maximize2, Minimize2 } from "lucide-react";
import LeaderboardScreen from "./LeaderboardScreen";
import TablesScreen from "./TablesScreen";
import { ScreenType, Player, Table } from "./types";
import { PlayerScore } from "../player/types";
import { participants } from "./participants";

function convertToPlayers(scores: PlayerScore[]): Player[] {
  return scores.map((p, index) => ({
    id: p.id,
    name: p.name,
    team: p.team,
    score: p.totalScore,
    rank: index + 1,
    status: p.status,
    currentTable: p.currentTable,
  }));
}

// Phase 1 fallback: build tables directly from static participants.ts data,
// merging live scores by name lookup.
function buildPhase1Tables(players: Player[]): Table[] {
  const scoreByName = new Map<string, number>();
  for (const p of players) {
    scoreByName.set(p.name.toUpperCase(), p.score);
  }

  const tableMap = new Map<number, Player[]>();
  participants
    .filter((p) => p.active)
    .forEach((p, index) => {
      const tableNum = p.tableNumber ?? 1;
      if (!tableMap.has(tableNum)) tableMap.set(tableNum, []);
      tableMap.get(tableNum)!.push({
        id: `p1-${index}`,
        name: p.name,
        team: p.team,
        score: scoreByName.get(p.name.toUpperCase()) ?? 0,
        rank: 0,
      });
    });

  return Array.from(tableMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([num, tablePlayers]) => ({
      id: `table-p1-${num}`,
      number: num,
      players: tablePlayers,
    }));
}

export default function ScreenController() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("leaderboard");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [currentPhase, setCurrentPhase] = useState(1);

  // Fetch current tournament phase on mount, then poll every 5s
  useEffect(() => {
    let cancelled = false;
    async function fetchPhase() {
      try {
        const res = await fetch("/api/admin");
        const data = await res.json();
        if (!cancelled && data.tournamentState?.phase) {
          setCurrentPhase(data.tournamentState.phase);
        }
      } catch {
        // ignore
      }
    }
    fetchPhase();
    const interval = setInterval(fetchPhase, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Subscribe to live player scores (leaderboard)
  useEffect(() => {
    const es = new EventSource("/api/player/stream");
    es.onmessage = (e) => {
      try {
        const data: PlayerScore[] = JSON.parse(e.data);
        if (Array.isArray(data) && data.length > 0) {
          setPlayers(convertToPlayers(data));
        }
      } catch {
        // ignore malformed events
      }
    };
    return () => es.close();
  }, []);

  // Subscribe to real-time table updates via SSE
  useEffect(() => {
    const es = new EventSource("/api/tables/stream");
    es.onmessage = (e) => {
      try {
        const data: Table[] = JSON.parse(e.data);
        if (Array.isArray(data) && data.length > 0) {
          setTables(data);
        }
      } catch {
        // ignore malformed events
      }
    };
    return () => es.close();
  }, []);

  // Phase 1: ALWAYS use static participants.ts formation
  // Phases 2+: use admin-pushed shuffled tables from SSE
  const displayTables =
    currentPhase === 1
      ? buildPhase1Tables(players)
      : tables.length > 0
        ? tables
        : buildPhase1Tables(players);

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
    <div className="h-screen flex flex-col bg-[#0a0a0b]">
      {/* Navigation Bar */}
      <nav className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#0a0a0b]">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src="/LOGO.png" alt="Remi 13 Logo" className="w-8 h-8 rounded-lg object-contain" />
          <span
            className="text-lg font-bold text-white"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            Remi 13
          </span>
        </div>

        {/* Nav Items */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentScreen(item.id)}
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
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Exit</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Fullscreen</span>
            </>
          )}
        </button>
      </nav>

      {/* Screen Content */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {currentScreen === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
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
              className="h-full"
            >
              <TablesScreen tables={displayTables} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
