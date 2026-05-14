'use client';

import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Medal, Award, XCircle } from 'lucide-react';
import { Player } from './types';
import { getTeamColor } from './team-style';

interface LeaderboardScreenProps {
  players: Player[];
  currentPhase?: number;
}

function getTeamStyle(team: string) {
  return getTeamColor(team);
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
  const teamStyle = getTeamStyle(player.team);
  const tableLabel = player.currentTable ? `Table ${player.currentTable}` : 'No table';

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
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`text-xs sm:text-sm ${teamStyle.text}`}>{player.team}</span>
          <span className="text-[10px] sm:text-xs text-zinc-500">{tableLabel}</span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-[10px] sm:text-xs text-emerald-400 tabular-nums">
          +{(player.currentPhaseScore ?? 0).toLocaleString()}
        </div>
        <div className={`text-base sm:text-lg font-black tabular-nums ${index < 3 ? 'text-white' : 'text-zinc-300'}`}>
          {player.score.toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
}

function PlayerRow({ player, index }: { player: Player; index: number }) {
  const teamStyle = getTeamStyle(player.team);
  const tableLabel = player.currentTable ? `T${player.currentTable}` : '-';

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

      <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${teamStyle.bg} ${teamStyle.text} whitespace-nowrap`}>
        {player.team}
      </span>

      <div className="w-10 text-center">
        <span className="text-xs text-zinc-500 tabular-nums">{tableLabel}</span>
      </div>

      <div className="w-12 sm:w-14 text-right">
        <span className="text-xs text-emerald-400 tabular-nums">
          +{(player.currentPhaseScore ?? 0).toLocaleString()}
        </span>
      </div>

      <div className="w-14 sm:w-16 text-right">
        <span className="font-semibold text-zinc-300 text-sm sm:text-base tabular-nums">
          {player.score.toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
}

function EliminatedRow({ player, index }: { player: Player; index: number }) {
  const teamStyle = getTeamStyle(player.team);
  const tableLabel = player.currentTable ? `T${player.currentTable}` : '-';

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.005, 0.3) }}
      className="flex items-center gap-2 px-2 py-1 border-b border-white/[0.02] opacity-50"
    >
      <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-zinc-600">
        {player.rank}
      </div>

      <div className="flex-1 min-w-0">
        <span className="font-medium text-zinc-500 text-xs sm:text-sm truncate line-through">
          {player.name}
        </span>
      </div>

      <span className={`text-[10px] px-1.5 py-0.5 rounded ${teamStyle.bg} ${teamStyle.text} whitespace-nowrap`}>
        {player.team}
      </span>

      <div className="w-8 text-center">
        <span className="text-[10px] text-zinc-600 tabular-nums">{tableLabel}</span>
      </div>

      <div className="w-14 sm:w-16 text-right">
        <span className="text-zinc-600 text-xs sm:text-sm tabular-nums">
          {player.score.toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Phase-5 layout: active semifinalists, eliminated below ────────────────
function Phase5Layout({ active, eliminated }: { active: Player[]; eliminated: Player[] }) {
  const topTen = active.slice(0, 10);
  const nextTen = active.slice(10, 20);

  // Split eliminated into columns for desktop
  const colSize = Math.ceil(eliminated.length / 3);
  const elCols = [
    eliminated.slice(0, colSize),
    eliminated.slice(colSize, colSize * 2),
    eliminated.slice(colSize * 2),
  ];

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-hidden min-h-0">
      {/* Active semifinalists */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 shrink-0">
        {/* Top 10 */}
        <div className="w-full sm:w-72 flex flex-col gap-2 shrink-0">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Top 10</h2>
          <div className="space-y-1">
            {topTen.map((player, index) => (
              <TopTenPlayer key={player.id} player={player} index={index} />
            ))}
          </div>
        </div>

        {/* 11–20 */}
        {nextTen.length > 0 && (
          <div className="flex-1 flex flex-col min-w-0">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">11–20</h2>
            <div className="space-y-0">
              {nextTen.map((player, index) => (
                <PlayerRow key={player.id} player={player} index={index} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Eliminated */}
      {eliminated.length > 0 && (
        <div className="flex flex-col overflow-hidden min-h-0">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <XCircle className="w-3 h-3 text-rose-600" />
            <h2 className="text-xs font-medium text-rose-700 uppercase tracking-wider">
              Gugur — {eliminated.length} pemain
            </h2>
          </div>

          {/* Mobile */}
          <div className="sm:hidden overflow-y-auto flex-1 min-h-0 pb-2">
            {eliminated.map((player, index) => (
              <EliminatedRow key={player.id} player={player} index={index} />
            ))}
          </div>

          {/* Desktop 3-col */}
          <div className="hidden sm:grid grid-cols-3 gap-2 overflow-hidden">
            {elCols.map((col, ci) => (
              <div key={ci} className="overflow-y-auto">
                {col.map((player, index) => (
                  <EliminatedRow key={player.id} player={player} index={ci * colSize + index} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Phase-6 layout: active finalists, eliminated below ────────────────────
function Phase6Layout({ active, eliminated }: { active: Player[]; eliminated: Player[] }) {
  const colSize = Math.ceil(eliminated.length / 3);
  const elCols = [
    eliminated.slice(0, colSize),
    eliminated.slice(colSize, colSize * 2),
    eliminated.slice(colSize * 2),
  ];

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-hidden min-h-0">
      {/* Finalists */}
      <div className="w-full sm:w-96 mx-auto flex flex-col gap-2 shrink-0">
        <h2 className="text-xs font-medium text-yellow-500 uppercase tracking-wider mb-1">
          Final — Top {active.length}
        </h2>
        <div className="space-y-1">
          {active.map((player, index) => (
            <TopTenPlayer key={player.id} player={player} index={index} />
          ))}
        </div>
      </div>

      {/* Eliminated */}
      {eliminated.length > 0 && (
        <div className="flex flex-col overflow-hidden min-h-0">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <XCircle className="w-3 h-3 text-rose-600" />
            <h2 className="text-xs font-medium text-rose-700 uppercase tracking-wider">
              Gugur — {eliminated.length} pemain
            </h2>
          </div>

          {/* Mobile */}
          <div className="sm:hidden overflow-y-auto flex-1 min-h-0 pb-2">
            {eliminated.map((player, index) => (
              <EliminatedRow key={player.id} player={player} index={index} />
            ))}
          </div>

          {/* Desktop 3-col */}
          <div className="hidden sm:grid grid-cols-3 gap-2 overflow-hidden">
            {elCols.map((col, ci) => (
              <div key={ci} className="overflow-y-auto">
                {col.map((player, index) => (
                  <EliminatedRow key={player.id} player={player} index={ci * colSize + index} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Default layout: phases 1–4 ────────────────────────────────────────────
function DefaultLayout({ players }: { players: Player[] }) {
  const topTen = players.slice(0, 10);
  const rest = players.slice(10);

  const colSize = Math.ceil(rest.length / 3);
  const col1 = rest.slice(0, colSize);
  const col2 = rest.slice(colSize, colSize * 2);
  const col3 = rest.slice(colSize * 2);

  return (
    <div className="flex-1 flex flex-col sm:flex-row gap-3 sm:gap-4 overflow-hidden">
      {/* Top 10 */}
      <div className="w-full sm:w-72 flex flex-col gap-2 shrink-0">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 shrink-0">Top 10</h2>
        <div className="overflow-y-auto pr-1 space-y-1 sm:space-y2">
          {topTen.map((player, index) => (
            <TopTenPlayer key={player.id} player={player} index={index} />
          ))}
        </div>
      </div>

      {/* Rankings 11+ */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 shrink-0">
          Rankings 11-{players.length}
        </h2>

        {/* Mobile */}
        <div className="sm:hidden overflow-y-auto flex-1 min-h-0">
          {rest.length > 0 && (
            <div className="grid grid-cols-[1fr_2.5rem_3.5rem_4rem] gap-2 px-2 pb-1 text-[10px] uppercase tracking-wider text-zinc-600">
              <span>Peserta</span>
              <span className="text-center">Meja</span>
              <span className="text-right">Babak</span>
              <span className="text-right">Total</span>
            </div>
          )}
          <div className="space-y-0 pb-4">
            {rest.map((player, index) => (
              <PlayerRow key={player.id} player={player} index={index} />
            ))}
          </div>
        </div>

        {/* Desktop 3-col */}
        <div className="hidden sm:grid grid-cols-3 gap-2 h-[calc(100%-24px)] overflow-hidden">
          {[col1, col2, col3].map((col, colIndex) => (
            <div key={colIndex} className="overflow-y-auto">
              {colIndex === 0 && (
                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 sticky top-0 bg-[#0a0a0b] py-1">
                  {11}-{10 + colSize} · Meja · Babak · Total
                </h3>
              )}
              {colIndex === 1 && (
                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 sticky top-0 bg-[#0a0a0b] py-1">
                  {11 + colSize}-{10 + colSize * 2} · Meja · Babak · Total
                </h3>
              )}
              {colIndex === 2 && (
                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 sticky top-0 bg-[#0a0a0b] py-1">
                  {11 + colSize * 2}-{players.length} · Meja · Babak · Total
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
  );
}

export default function LeaderboardScreen({ players, currentPhase = 1 }: LeaderboardScreenProps) {
  const isLatePhase = currentPhase >= 5;

  const activePlayers = isLatePhase
    ? players.filter((player) => player.status === 'active' || player.status === 'winner')
    : players;
  const eliminatedPlayers = isLatePhase
    ? players.filter((player) => player.status === 'eliminated')
    : [];

  const phaseLabel =
    currentPhase === 5
      ? 'Semifinal'
      : currentPhase === 6
        ? 'Final'
        : `Fase ${currentPhase}`;

  return (
    <div className="h-full flex flex-col p-2 sm:p-4 bg-[#0a0a0b] overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between mb-3 pb-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
          <h1 className="text-lg sm:text-xl font-bold text-white">Leaderboard</h1>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{phaseLabel}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          {isLatePhase ? (
            <span className="text-zinc-500">
              {activePlayers.length} aktif
              {eliminatedPlayers.length > 0 && (
                <span className="text-rose-700 ml-2">{eliminatedPlayers.length} gugur</span>
              )}
            </span>
          ) : (
            <span className="text-zinc-500">{players.length} Players</span>
          )}
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400">Live</span>
          </span>
        </div>
      </header>

      {currentPhase === 5 ? (
        <Phase5Layout active={activePlayers} eliminated={eliminatedPlayers} />
      ) : currentPhase === 6 ? (
        <Phase6Layout active={activePlayers} eliminated={eliminatedPlayers} />
      ) : (
        <DefaultLayout players={players} />
      )}
    </div>
  );
}
