'use client';

import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { Table } from './types';
import { churchColors, defaultChurchColor } from './participants';

interface TablesScreenProps {
  tables: Table[];
}

function getChurchStyle(church: string) {
  return churchColors[church] || defaultChurchColor;
}

export default function TablesScreen({ tables }: TablesScreenProps) {
  return (
    <div className="h-full flex flex-col p-4 bg-[#0a0a0b]">
      {/* Header */}
      <header className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" />
          <h1 className="text-xl font-bold text-white">Tables</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500">{tables.length} Tables</span>
          <span className="text-zinc-500">
            {tables.reduce((acc, t) => acc + t.players.length, 0)} Players
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-blue-400">Active</span>
          </span>
        </div>
      </header>

      {/* Tables Grid - Dense Layout */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2">
          {tables.map((table, index) => (
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
                <span className="text-[10px] text-zinc-500">{table.players.length}</span>
              </div>

              {/* Players List - Compact */}
              <div className="p-1">
                {table.players.map((player, playerIndex) => {
                  const churchStyle = getChurchStyle(player.church);
                  
                  return (
                    <motion.div
                      key={player.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: playerIndex * 0.02 }}
                      className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="text-[10px] text-zinc-600 w-3">{playerIndex + 1}</span>
                        <span className="text-xs text-white truncate">{player.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] px-1 rounded ${churchStyle.bg} ${churchStyle.text}`}>
                          {player.church}
                        </span>
                        <span className="text-xs font-semibold text-white tabular-nums w-10 text-right">
                          {player.score.toLocaleString()}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
