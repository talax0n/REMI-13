"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, Maximize2, Minimize2 } from "lucide-react";
import LeaderboardScreen from "./LeaderboardScreen";
import TablesScreen from "./TablesScreen";
import { ScreenType, Player, Table } from "./types";
import { participants } from "./participants";

// Generate players from ALL participant data (not just active ones)
function generatePlayersFromParticipants(): Player[] {
  return participants
    .map((p, index) => {
      // Generate realistic scores (deterministic based on index)
      const baseScore = 10000 - index * 95;
      const variance = (index * 37) % 300; // deterministic variance
      return {
        id: `player-${index}`,
        name: p.name,
        church: p.church,
        score: baseScore + variance,
        rank: index + 1,
        status: (p.active ? "active" : "eliminated") as Player["status"],
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((p, index) => ({ ...p, rank: index + 1 }));
}

// Generate tables from active players only, 5 per table
function generateTables(players: Player[]): Table[] {
  const active = players.filter((p) => p.status === "active");
  const tables: Table[] = [];
  for (let i = 0; i < active.length; i += 5) {
    const tablePlayers = active.slice(i, i + 5);
    tables.push({
      id: `table-${i / 5}`,
      number: i / 5 + 1,
      players: tablePlayers,
    });
  }
  console.log(tables);
  return tables;
}

export default function ScreenController() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("leaderboard");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const players = useMemo(() => generatePlayersFromParticipants(), []);
  const [tables, setTables] = useState<Table[]>(() => generateTables(players));

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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-yellow-950" />
          </div>
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
              <LeaderboardScreen players={players} />
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
              <TablesScreen tables={tables} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
