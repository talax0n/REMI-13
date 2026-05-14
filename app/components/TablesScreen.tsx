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

export default function TablesScreen({ tables }: TablesScreenProps) {
  const realPlayerCount = tables.reduce(
    (acc, table) => acc + table.players.filter((player) => !player.isDummy).length,
    0
  );

  return (
    <div className="flex flex-col p-2 sm:p-4 bg-[#0a0a0b] sm:h-full">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-y-1 gap-x-3 mb-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 shrink-0" />
          <h1 className="text-base sm:text-xl font-bold text-white">Tables</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-[11px] sm:text-sm">
          <span className="text-zinc-500 whitespace-nowrap">{tables.length} Tables</span>
          <span className="text-zinc-500 whitespace-nowrap">
            {realPlayerCount} Players
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-blue-400">Active</span>
          </span>
        </div>
      </header>

      {/* Tables Grid - Dense Layout */}
      <div className="flex-1 sm:overflow-y-auto">
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2">
          {tables.map((table, index) => {
            const realPlayers = table.players.filter((player) => !player.isDummy);
            const placeholders = table.players.length - realPlayers.length;

            return (
              <motion.div
                key={table.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15, delay: index * 0.01 }}
                className="bg-zinc-900/50 border border-white/5 rounded-lg overflow-hidden hover:border-white/10 transition-colors"
              >
                {/* Table Header */}
                <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-800/50 border-b border-white/5">
                  <span className="text-sm font-bold text-white">Table {table.number}</span>
                  <span className="text-[10px] text-zinc-500">{realPlayers.length}/5</span>
                </div>

                {/* Players List - Compact */}
                <div className="p-1">
                  {realPlayers.map((player, playerIndex) => {
                  const teamStyle = getTeamStyle(player.team);

                  return (
                    <motion.div
                      key={player.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: playerIndex * 0.02 }}
                      className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-white/[0.03] transition-colors"
                    >
                      <span className="text-[10px] text-zinc-600 w-3 shrink-0">{playerIndex + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate leading-tight">{player.name}</p>
                        <p className={`text-[9px] truncate ${teamStyle.text}`}>{player.team}</p>
                      </div>
                      <span className="text-xs font-semibold text-white tabular-nums shrink-0 text-right">
                        {player.score.toLocaleString()}
                      </span>
                    </motion.div>
                  );
                  })}
                {Array.from({ length: placeholders + Math.max(0, 5 - table.players.length) }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center px-1.5 py-1 rounded"
                  >
                    <span className="text-[10px] text-zinc-700 w-3">{realPlayers.length + i + 1}</span>
                    <span className="text-xs text-zinc-700 italic ml-1.5">Empty Seat</span>
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
