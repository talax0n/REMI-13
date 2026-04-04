'use client';

import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Medal, Award } from 'lucide-react';
import { Player } from './types';
import { churchColors, defaultChurchColor } from './participants';

interface LeaderboardScreenProps {
  players: Player[];
}

function getChurchStyle(church: string) {
  return churchColors[church] || defaultChurchColor;
}

function RankChange({ current, previous }: { current: number; previous?: number }) {
  if (!previous || current === previous) return null;
  
  if (current < previous) {
    return (
      <span className="inline-flex items-center text-[10px] text-emerald-400 font-medium">
        <TrendingUp className="w-3 h-3 mr-0.5" />
        {previous - current}
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center text-[10px] text-rose-400 font-medium">
      <TrendingDown className="w-3 h-3 mr-0.5" />
      {current - previous}
      </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-500 flex items-center justify-center">
        <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-950" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-300 flex items-center justify-center">
        <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-600 flex items-center justify-center">
        <Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-100" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-sm sm:text-base font-bold text-white">
      {rank}
    </div>
  );
}

function TopTenPlayer({ player, index }: { player: Player; index: number }) {
  const churchStyle = getChurchStyle(player.church);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className={`
        flex items-center gap-3 p-2 sm:p-3 rounded-lg border
        ${index === 0 
          ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/40 shadow-lg shadow-yellow-500/10' 
          : index === 1
            ? 'bg-gradient-to-r from-slate-300/20 to-slate-400/10 border-slate-300/40'
            : index === 2
              ? 'bg-gradient-to-r from-amber-700/20 to-amber-800/10 border-amber-700/40'
              : 'bg-zinc-900/50 border-white/5 hover:border-white/10'
        }
      `}
    >
      <RankBadge rank={player.rank} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-white text-sm sm:text-base truncate">{player.name}</h3>
          <RankChange current={player.rank} previous={player.previousRank} />
        </div>
        <span className={`text-xs sm:text-sm ${churchStyle.text}`}>{player.church}</span>
      </div>
      
      <div className="text-right">
        <div className={`text-base sm:text-lg font-black tabular-nums ${index < 3 ? 'text-white' : 'text-zinc-300'}`}>
          {player.score.toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
}

function PlayerRow({ player, index }: { player: Player; index: number }) {
  const churchStyle = getChurchStyle(player.church);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.005, 0.5) }}
      className="flex items-center gap-2 px-2 py-1.5 sm:py-2 hover:bg-white/[0.03] transition-colors border-b border-white/[0.03]"
    >
      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded flex items-center justify-center text-xs sm:text-sm font-bold text-zinc-500">
        {player.rank}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-zinc-300 text-sm sm:text-base truncate">{player.name}</span>
          <RankChange current={player.rank} previous={player.previousRank} />
        </div>
      </div>
      
      <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${churchStyle.bg} ${churchStyle.text} whitespace-nowrap`}>
        {player.church}
      </span>
      
      <div className="w-14 sm:w-16 text-right">
        <span className="font-semibold text-zinc-300 text-sm sm:text-base tabular-nums">
          {player.score.toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
}

export default function LeaderboardScreen({ players }: LeaderboardScreenProps) {
  const topTen = players.slice(0, 10);
  const rest = players.slice(10);
  
  // Split remaining players into columns - 1 column on mobile, 3 on desktop
  const colSize = Math.ceil(rest.length / 3);
  const col1 = rest.slice(0, colSize);
  const col2 = rest.slice(colSize, colSize * 2);
  const col3 = rest.slice(colSize * 2);

  return (
    <div className="h-full flex flex-col p-2 sm:p-4 bg-[#0a0a0b] overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between mb-3 pb-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
          <h1 className="text-lg sm:text-xl font-bold text-white">Leaderboard</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <span className="text-zinc-500">{players.length} Players</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400">Live</span>
          </span>
        </div>
      </header>

      <div className="flex-1 flex flex-col sm:flex-row gap-3 sm:gap-4 overflow-hidden">
        {/* Top 10 - Full width on mobile, fixed width on desktop */}
        <div className="w-full sm:w-72 flex flex-col gap-2 shrink-0">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 shrink-0">Top 10</h2>
          <div className="overflow-y-auto pr-1 space-y-1 sm:space-y2">
            {topTen.map((player, index) => (
              <TopTenPlayer key={player.id} player={player} index={index} />
            ))}
          </div>
        </div>

        {/* Rankings 11+ - Single column on mobile, 3 columns on desktop */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 shrink-0">
            Rankings 11-{players.length}
          </h2>
          
          {/* Mobile: Single scrollable list */}
          <div className="sm:hidden overflow-y-auto flex-1 min-h-0">
            <div className="space-y-0 pb-4">
              {rest.map((player, index) => (
                <PlayerRow 
                  key={player.id} 
                  player={player} 
                  index={index} 
                />
              ))}
            </div>
          </div>
          
          {/* Desktop: 3 columns */}
          <div className="hidden sm:grid grid-cols-3 gap-2 h-[calc(100%-24px)] overflow-hidden">
            {[col1, col2, col3].map((col, colIndex) => (
              <div key={colIndex} className="overflow-y-auto">
                {colIndex === 0 && (
                  <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 sticky top-0 bg-[#0a0a0b] py-1">
                    {11}-{10 + colSize}
                  </h3>
                )}
                {colIndex === 1 && (
                  <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 sticky top-0 bg-[#0a0a0b] py-1">
                    {11 + colSize}-{10 + colSize * 2}
                  </h3>
                )}
                {colIndex === 2 && (
                  <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 sticky top-0 bg-[#0a0a0b] py-1">
                    {11 + colSize * 2}-{players.length}
                  </h3>
                )}
                <div className="space-y-0">
                  {col.map((player, index) => (
                    <PlayerRow 
                      key={player.id} 
                      player={player} 
                      index={colIndex * colSize + index} 
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
