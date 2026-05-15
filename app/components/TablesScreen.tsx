'use client';

import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { Table } from './types';
import { getTeamColor } from './team-style';

interface TablesScreenProps {
  tables: Table[];
}

function getTeamStyle(team: string) {
  return getTeamColor(team);
}

function pickRows(n: number) {
  if (n <= 9) return 3;
  if (n <= 20) return 4;
  if (n <= 35) return 5;
  if (n <= 54) return 6;
  return 7;
}

export default function TablesScreen({ tables }: TablesScreenProps) {
  const realPlayerCount = tables.reduce(
    (acc, table) => acc + table.players.filter((player) => !player.isDummy).length,
    0
  );
  const rowCount = pickRows(tables.length);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0a0a0b] p-2 sm:p-4">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-y-1 gap-x-3 mb-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-7 2xl:h-7 text-blue-500 shrink-0" />
          <h1 className="text-base sm:text-xl 2xl:text-3xl font-bold text-white">Tables</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 2xl:gap-6 text-[11px] sm:text-sm 2xl:text-lg">
          <span className="text-zinc-500 whitespace-nowrap">{tables.length} Tables</span>
          <span className="text-zinc-500 whitespace-nowrap">
            {realPlayerCount} Players
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 2xl:w-3 2xl:h-3 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-blue-400">Active</span>
          </span>
        </div>
      </header>

      {/* Tables Grid - Dense Layout */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          className="grid h-full grid-flow-col gap-2 2xl:gap-3 overflow-hidden"
          style={{ gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }}
        >
          {tables.map((table, index) => {
            const realPlayers = table.players.filter((player) => !player.isDummy);
            const placeholders = table.players.length - realPlayers.length;

            return (
              <motion.div
                key={table.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  layout: { type: 'spring', stiffness: 320, damping: 32, mass: 0.6 },
                  default: { duration: 0.15, delay: index * 0.01 },
                }}
                className="flex min-h-0 flex-col overflow-hidden rounded-lg 2xl:rounded-xl border border-white/5 bg-zinc-900/50 transition-colors hover:border-white/10"
              >
                {/* Table Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-white/5 bg-zinc-800/50 px-2.5 py-1.5 2xl:px-3 2xl:py-2">
                  <span className="text-sm 2xl:text-lg font-bold text-white">Table {table.number}</span>
                  <span className="text-[11px] 2xl:text-sm text-zinc-500">{realPlayers.length}/5</span>
                </div>

                {/* Players List - one line each */}
                <div className="flex min-h-0 flex-1 flex-col justify-evenly px-1.5 py-1 2xl:px-2 2xl:py-1.5">
                  {realPlayers.map((player, playerIndex) => {
                    const teamStyle = getTeamStyle(player.team);

                    return (
                      <motion.div
                        key={player.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          layout: { type: 'spring', stiffness: 320, damping: 32, mass: 0.6 },
                          default: { delay: playerIndex * 0.02 },
                        }}
                        className="flex items-center gap-2 rounded px-1 py-0.5 transition-colors hover:bg-white/[0.03]"
                      >
                        <span className="w-4 2xl:w-5 shrink-0 text-[11px] 2xl:text-sm text-zinc-600">{playerIndex + 1}</span>
                        <span className="truncate text-sm 2xl:text-base text-white">{player.name}</span>
                        <span className={`truncate text-[10px] 2xl:text-xs ${teamStyle.text}`}>{player.team}</span>
                        <span className="ml-auto shrink-0 text-right text-sm 2xl:text-base font-semibold tabular-nums text-white">
                          {player.score.toLocaleString()}
                        </span>
                      </motion.div>
                    );
                  })}
                  {Array.from({ length: placeholders + Math.max(0, 5 - table.players.length) }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex items-center gap-2 rounded px-1 py-0.5"
                    >
                      <span className="w-4 2xl:w-5 shrink-0 text-[11px] 2xl:text-sm text-zinc-700">{realPlayers.length + i + 1}</span>
                      <span className="truncate text-sm 2xl:text-base italic text-zinc-700">Empty Seat</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
