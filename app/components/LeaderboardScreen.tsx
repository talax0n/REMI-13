'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Medal, Award, XCircle, Search, X } from 'lucide-react';
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
  if (rank <= 20) {
    return (
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-sm sm:text-base font-bold text-yellow-300">
        {rank}
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
  const isTop20 = player.rank <= 20;

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.005, 0.5) }}
      className={`flex items-center gap-2 px-2 py-1.5 sm:py-2 hover:bg-white/[0.03] transition-colors border-b border-white/[0.03] ${isTop20 ? 'bg-yellow-500/5' : ''}`}
    >
      <div className={`w-6 h-6 sm:w-8 sm:h-8 shrink-0 rounded flex items-center justify-center text-xs sm:text-sm font-bold ${isTop20 ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-300' : 'text-zinc-500'}`}>
        {player.rank}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-zinc-300 text-sm sm:text-base truncate">{player.name}</span>
          <RankChange current={player.rank} previous={player.previousRank} />
        </div>
        <span className={`text-[10px] sm:text-xs ${teamStyle.text} truncate block`}>
          {player.team}
        </span>
      </div>

      <div className="w-8 sm:w-10 shrink-0 text-center">
        <span className="text-[11px] sm:text-xs text-zinc-500 tabular-nums">{tableLabel}</span>
      </div>

      <div className="w-12 sm:w-14 shrink-0 text-right">
        <span className="text-[11px] sm:text-xs text-emerald-400 tabular-nums">
          +{(player.currentPhaseScore ?? 0).toLocaleString()}
        </span>
      </div>

      <div className="w-12 sm:w-16 shrink-0 text-right">
        <span className="font-semibold text-zinc-300 text-xs sm:text-base tabular-nums">
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

function CompactLeaderboardRow({ player, index }: { player: Player; index: number }) {
  const teamStyle = getTeamStyle(player.team);
  const tableLabel = player.currentTable ? `T${player.currentTable}` : '-';
  const isEliminated = player.status === 'eliminated' || player.status === 'archived';
  const moved =
    typeof player.previousRank === 'number' && player.previousRank !== player.rank;
  const movedUp = moved && (player.previousRank as number) > player.rank;

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        boxShadow: moved
          ? movedUp
            ? '0 0 0 1px rgba(16,185,129,0.45), 0 8px 24px -8px rgba(16,185,129,0.35)'
            : '0 0 0 1px rgba(244,63,94,0.35), 0 8px 24px -8px rgba(244,63,94,0.25)'
          : '0 0 0 0 rgba(0,0,0,0)',
      }}
      transition={{
        layout: { type: 'spring', stiffness: 320, damping: 32, mass: 0.6 },
        opacity: { duration: 0.12, delay: Math.min(index * 0.003, 0.2) },
        boxShadow: { duration: 0.8 },
      }}
      className={`flex min-h-0 flex-1 items-center gap-2 2xl:gap-3 rounded-md border px-2 py-1 2xl:px-3 2xl:py-1.5 ${
        isEliminated
          ? 'border-white/[0.03] bg-zinc-950/50 opacity-55'
          : player.rank <= 3
            ? 'border-yellow-400/50 bg-yellow-500/20'
            : player.rank <= 10
              ? 'border-amber-500/30 bg-amber-500/12'
              : player.rank <= 20
                ? 'border-yellow-500/15 bg-yellow-500/[0.06]'
                : 'border-white/[0.04] bg-zinc-900/55'
      }`}
    >
      <span className={`w-8 2xl:w-12 shrink-0 text-sm 2xl:text-lg font-bold tabular-nums ${
        isEliminated ? 'text-zinc-500' : 'text-zinc-100'
      }`}>
        #{player.rank}
      </span>
      <span
        className={`truncate text-sm 2xl:text-lg font-semibold ${
          isEliminated ? 'text-zinc-500 line-through' : 'text-white'
        }`}
      >
        {player.name}
      </span>
      <span className={`truncate text-[10px] 2xl:text-xs ${teamStyle.text}`}>{player.team}</span>
      <RankChange current={player.rank} previous={player.previousRank} />
      <span className="ml-auto shrink-0 text-[11px] 2xl:text-sm tabular-nums text-zinc-500">
        {tableLabel}
      </span>
      <span className={`w-12 2xl:w-20 shrink-0 text-right text-sm 2xl:text-lg font-black tabular-nums ${
        isEliminated ? 'text-zinc-500' : 'text-white'
      }`}>
        {player.score.toLocaleString()}
      </span>
    </motion.div>
  );
}

function useContainerSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, size };
}

function CompactAllPlayersLayout({ players }: { players: Player[] }) {
  const { ref, size } = useContainerSize<HTMLDivElement>();
  const n = players.length;

  // Pick column count so every player fits without scrolling.
  // Heuristic: each row needs ~36-44px height + 8px gap; each column needs ~240px width.
  const MIN_ROW_H = 36;
  const ROW_GAP = 8;
  const MIN_COL_W = 240;
  const COL_GAP = 8;

  const availH = size.h || 600;
  const availW = size.w || 1200;

  const rowsThatFit = Math.max(1, Math.floor((availH + ROW_GAP) / (MIN_ROW_H + ROW_GAP)));
  const maxColsByWidth = Math.max(1, Math.floor((availW + COL_GAP) / (MIN_COL_W + COL_GAP)));

  const colsNeeded = Math.max(1, Math.ceil(n / rowsThatFit));
  const cols = Math.max(1, Math.min(maxColsByWidth, colsNeeded));
  const rowsPerCol = Math.max(1, Math.ceil(n / cols));

  const chunks: Player[][] = Array.from({ length: cols }, (_, ci) =>
    players.slice(ci * rowsPerCol, (ci + 1) * rowsPerCol),
  );

  return (
    <LayoutGroup>
      <div
        ref={ref}
        className="grid flex-1 min-h-0 gap-2 overflow-hidden"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {chunks.map((chunk, ci) => (
          <div key={ci} className="flex min-h-0 flex-col gap-1.5 2xl:gap-2">
            {chunk.map((player, index) => (
              <CompactLeaderboardRow
                key={player.id}
                player={player}
                index={ci * rowsPerCol + index}
              />
            ))}
          </div>
        ))}
      </div>
    </LayoutGroup>
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
    <div className="flex-1 flex flex-col gap-3 sm:overflow-hidden min-h-0">
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
        <div className="flex flex-col sm:overflow-hidden min-h-0">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <XCircle className="w-3 h-3 text-rose-600" />
            <h2 className="text-xs font-medium text-rose-700 uppercase tracking-wider">
              Gugur — {eliminated.length} pemain
            </h2>
          </div>

          {/* Mobile */}
          <div className="sm:hidden pb-2">
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
    <div className="flex-1 flex flex-col gap-3 sm:overflow-hidden min-h-0">
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
        <div className="flex flex-col sm:overflow-hidden min-h-0">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <XCircle className="w-3 h-3 text-rose-600" />
            <h2 className="text-xs font-medium text-rose-700 uppercase tracking-wider">
              Gugur — {eliminated.length} pemain
            </h2>
          </div>

          {/* Mobile */}
          <div className="sm:hidden pb-2">
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
    <div className="flex-1 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:overflow-hidden">
      {/* Top 10 */}
      <div className="w-full sm:w-72 flex flex-col gap-2 shrink-0">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 shrink-0">Top 10</h2>
        <div className="sm:overflow-y-auto pr-1 space-y-1 sm:space-y2">
          {topTen.map((player, index) => (
            <TopTenPlayer key={player.id} player={player} index={index} />
          ))}
        </div>
      </div>

      {/* Rankings 11+ */}
      <div className="flex-1 flex flex-col sm:overflow-hidden min-h-0">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 shrink-0">
          Rankings 11-{players.length}
        </h2>

        {/* Mobile */}
        <div className="sm:hidden">
          {rest.length > 0 && (
            <div className="flex items-center gap-2 px-2 pb-1 text-[10px] uppercase tracking-wider text-zinc-600">
              <span className="w-6 shrink-0" />
              <span className="flex-1 min-w-0">Peserta</span>
              <span className="w-8 shrink-0 text-center">Meja</span>
              <span className="w-12 shrink-0 text-right">Babak</span>
              <span className="w-12 shrink-0 text-right">Total</span>
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

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
        : `Babak ${currentPhase}`;

  const trimmed = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!trimmed) return [];
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(trimmed) ||
        p.team.toLowerCase().includes(trimmed),
    );
  }, [players, trimmed]);

  return (
    <div className="flex flex-col p-2 sm:p-4 bg-[#0a0a0b] sm:h-full sm:overflow-hidden">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-y-1 gap-x-3 mb-3 pb-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 shrink-0" />
          <h1 className="text-base sm:text-xl font-bold text-white">Leaderboard</h1>
          <span className="text-[10px] sm:text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full whitespace-nowrap">{phaseLabel}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-[11px] sm:text-sm">
          {isLatePhase ? (
            <span className="text-zinc-500 whitespace-nowrap">
              {activePlayers.length} aktif
              {eliminatedPlayers.length > 0 && (
                <span className="text-rose-700 ml-2">{eliminatedPlayers.length} gugur</span>
              )}
            </span>
          ) : (
            <span className="text-zinc-500 whitespace-nowrap">{players.length} Players</span>
          )}
          <span className="flex items-center gap-1 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400">Live</span>
          </span>
          <button
            onClick={() => {
              setSearchOpen((v) => !v);
              if (searchOpen) setQuery('');
            }}
            aria-label={searchOpen ? 'Close search' : 'Search players'}
            className={`sm:hidden inline-flex items-center justify-center w-8 h-8 rounded-full border transition-colors ${
              searchOpen
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-zinc-800/80 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-700'
            }`}
          >
            {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile search input */}
      <AnimatePresence initial={false}>
        {searchOpen && (
          <motion.div
            key="search"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden overflow-hidden shrink-0"
          >
            <div className="relative mb-3">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Search className="w-4 h-4 text-zinc-400" />
              </span>
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or team"
                className="block w-full h-11 bg-zinc-900 border border-white/10 rounded-full text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition"
                style={{ paddingLeft: '2.5rem', paddingRight: query ? '2.5rem' : '1rem' }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute inset-y-0 right-0 flex items-center pr-2"
                >
                  <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile filtered view */}
      {trimmed && (
        <div className="sm:hidden">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
            {filtered.length} result{filtered.length === 1 ? '' : 's'}
          </h2>
          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-600 px-2 py-6 text-center">No players match &quot;{query}&quot;.</p>
          ) : (
            <div className="space-y-0">
              {filtered.map((player, index) => (
                <PlayerRow key={player.id} player={player} index={index} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Normal layout (desktop always; mobile when no query) */}
      <div className={`${trimmed ? 'hidden sm:flex' : 'flex'} flex-1 flex-col min-h-0 overflow-hidden`}>
        <CompactAllPlayersLayout players={isLatePhase ? [...activePlayers, ...eliminatedPlayers] : players} />
      </div>
    </div>
  );
}
