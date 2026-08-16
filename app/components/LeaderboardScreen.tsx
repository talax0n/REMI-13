'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Search, X, Crown, UsersRound } from 'lucide-react';
import { Player } from './types';
import { getTeamColor } from './team-style';
import { REMI13_RULES } from '@/lib/tournament-config';
import TournamentTimer from './TournamentTimer';
import { TimerSnapshot } from '@/lib/timer';
import { SuitPip } from './suit-pip';

interface LeaderboardScreenProps {
  players: Player[];
  currentPhase?: number;
  timer: TimerSnapshot | null;
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
        isEliminated
          ? 'text-zinc-500'
          : player.rank <= 3
            ? 'text-yellow-300'
            : player.rank <= 10
              ? 'text-amber-400'
              : player.rank <= 20
                ? 'text-yellow-500/80'
                : 'text-zinc-400'
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

// Full roster no longer forces itself to fit one screen — once the list is
// taller than the panel it scrolls continuously instead, so rows stay
// readable regardless of player count. A muted copy of the list is appended
// below so the loop can wrap seamlessly at the halfway mark instead of
// snapping back to the top. Short rosters that already fit just sit still.
const SECONDS_PER_ROW = 1.15;
const MIN_SCROLL_SECONDS = 14;

function AutoScrollPlayersLayout({ players }: { players: Player[] }) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const check = () => setOverflowing(content.scrollHeight > container.clientHeight + 1);
    check();

    const ro = new ResizeObserver(check);
    ro.observe(container);
    ro.observe(content);
    return () => ro.disconnect();
  }, [players.length]);

  if (players.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
        Belum ada peserta terdaftar.
      </div>
    );
  }

  const shouldScroll = overflowing && !reduceMotion;
  const duration = Math.max(MIN_SCROLL_SECONDS, players.length * SECONDS_PER_ROW);

  return (
    <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
      <div className={shouldScroll ? 'h-full overflow-hidden' : 'h-full overflow-y-auto'}>
        <div
          ref={contentRef}
          className={`grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2 2xl:grid-cols-3 ${
            shouldScroll ? 'animate-leaderboard-scroll' : ''
          }`}
          style={shouldScroll ? { animationDuration: `${duration}s` } : undefined}
        >
          {players.map((player, index) => (
            <CompactLeaderboardRow key={player.id} player={player} index={index} />
          ))}
          {shouldScroll &&
            players.map((player, index) => (
              <CompactLeaderboardRow key={`loop-${player.id}`} player={player} index={index} />
            ))}
        </div>
      </div>
    </div>
  );
}

interface TeamStanding {
  team: string;
  score: number;
  players: number;
}

function getTeamStandings(players: Player[]): TeamStanding[] {
  const byTeam = new Map<string, TeamStanding>();
  for (const player of players) {
    const current = byTeam.get(player.team) ?? { team: player.team, score: 0, players: 0 };
    current.score += player.score;
    current.players += 1;
    byTeam.set(player.team, current);
  }
  return Array.from(byTeam.values()).sort((a, b) =>
    b.score - a.score || b.players - a.players || a.team.localeCompare(b.team),
  );
}

function WinnerSummary({ players }: { players: Player[] }) {
  const topFive = players.slice(0, REMI13_RULES.individualWinners);

  return (
    <section className="mb-4 shrink-0 rounded-xl border border-amber-400/20 bg-gradient-to-b from-amber-400/[0.07] to-transparent p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-300" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-200">
            Top {REMI13_RULES.individualWinners} individu
          </h2>
        </div>
        <span className="text-[10px] text-zinc-500">Akumulasi Babak 1–5</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {topFive.map((player) => {
          const teamStyle = getTeamStyle(player.team);
          const isLeader = player.rank === 1;
          return (
            <div
              key={player.id}
              className={`relative flex min-w-0 items-center gap-2.5 overflow-hidden rounded-lg border border-l-[3px] border-dashed bg-zinc-900/70 py-2.5 pl-3 pr-2.5 ${
                isLeader ? 'border-amber-300/70 ring-1 ring-amber-300/30' : 'border-white/10 border-l-white/20'
              }`}
            >
              <SuitPip index={player.rank - 1} className="absolute -right-1 -top-1 text-3xl opacity-[0.07]" />
              <span
                className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-[family-name:var(--font-space-grotesk)] text-xs font-black ${
                  isLeader ? 'bg-amber-300/25 text-amber-200' : 'bg-white/[0.08] text-zinc-300'
                }`}
              >
                {player.rank}
              </span>
              <div className="relative min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white sm:text-sm">{player.name}</p>
                <p className={`truncate text-[10px] ${teamStyle.text}`}>{player.team}</p>
              </div>
              <span className="relative shrink-0 font-[family-name:var(--font-space-grotesk)] text-sm font-black tabular-nums text-white">
                {player.score.toLocaleString()}
              </span>
            </div>
          );
        })}
        {topFive.length === 0 && (
          <p className="col-span-full px-2 py-3 text-xs text-zinc-500">Menunggu nilai masuk — skor akan muncul di sini.</p>
        )}
      </div>
    </section>
  );
}

function TeamStandings({ players }: { players: Player[] }) {
  const standings = getTeamStandings(players);
  const leader = standings[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <section className="relative shrink-0 overflow-hidden rounded-2xl border border-amber-300/25 bg-gradient-to-br from-amber-400/[0.08] via-zinc-950 to-zinc-950 p-4 sm:p-6">
        <SuitPip index={0} className="pointer-events-none absolute -right-3 -top-4 text-[7rem] leading-none opacity-[0.05]" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/80">
              <Trophy className="h-4 w-4 text-amber-300" /> Juara umum sementara
            </p>
            <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-black text-white sm:text-3xl">
              {leader?.team ?? 'Belum ada data'}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">Total nilai seluruh anggota team dari Babak 1–5</p>
          </div>
          <div className="text-right">
            <p className="font-[family-name:var(--font-space-grotesk)] text-3xl font-black tabular-nums text-amber-300">
              {leader?.score.toLocaleString() ?? '0'}
            </p>
            <p className="text-xs text-zinc-500">total nilai</p>
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-white/[0.07] bg-zinc-900/50">
        <div className="grid grid-cols-[2rem_1fr_auto_auto] gap-2 border-b border-white/[0.07] px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-500 sm:grid-cols-[3rem_1fr_6rem_7rem]">
          <span>#</span><span>Team</span><span className="text-right">Peserta</span><span className="text-right">Total nilai</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {standings.map((standing, index) => {
            const teamStyle = getTeamStyle(standing.team);
            const isLeader = index === 0;
            return (
              <div
                key={standing.team}
                className={`grid grid-cols-[2rem_1fr_auto_auto] items-center gap-2 border-l-2 px-3 py-3 sm:grid-cols-[3rem_1fr_6rem_7rem] ${
                  isLeader ? 'border-l-amber-300/70 bg-amber-400/[0.05]' : 'border-l-transparent'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full font-[family-name:var(--font-space-grotesk)] text-xs font-black tabular-nums ${
                    isLeader ? 'bg-amber-300/20 text-amber-200' : 'text-zinc-500'
                  }`}
                >
                  {index + 1}
                </span>
                <span className={`flex min-w-0 items-center gap-2 truncate text-sm font-semibold ${teamStyle.text}`}>
                  <UsersRound className="h-4 w-4 shrink-0 opacity-70" />
                  {standing.team}
                </span>
                <span className="text-right text-sm tabular-nums text-zinc-400">{standing.players}</span>
                <span className="text-right font-[family-name:var(--font-space-grotesk)] text-sm font-black tabular-nums text-white">
                  {standing.score.toLocaleString()}
                </span>
              </div>
            );
          })}
          {standings.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-zinc-500">Menunggu peserta terdaftar.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardScreen({ players, currentPhase = 1, timer }: LeaderboardScreenProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'individual' | 'teams'>('individual');

  // Eliminated players are excluded from the leaderboard entirely (no "Gugur"
  // section). The API already filters them out, but guard here in case stale
  // rows leak through during a phase transition.
  const visiblePlayers = players.filter((player) => player.status !== 'eliminated');
  const phaseLabel = currentPhase >= REMI13_RULES.totalPhases
    ? 'Hasil akhir'
    : `Babak ${currentPhase}`;

  const trimmed = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!trimmed) return [];
    return visiblePlayers.filter(
      (p) =>
        p.name.toLowerCase().includes(trimmed) ||
        p.team.toLowerCase().includes(trimmed),
    );
  }, [visiblePlayers, trimmed]);

  return (
    <div className="flex flex-col p-2 sm:p-4 bg-[#0a0a0b] sm:h-full sm:overflow-hidden">
      <TournamentTimer timer={timer} />
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-y-1 gap-x-3 mb-3 pb-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 shrink-0" />
          <h1 className="text-base sm:text-xl font-bold text-white">Leaderboard</h1>
          <span className="text-[10px] sm:text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full whitespace-nowrap">{phaseLabel}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-[11px] sm:text-sm">
          <span className="text-zinc-500 whitespace-nowrap">{visiblePlayers.length} peserta</span>
          <span className="hidden text-zinc-600 sm:inline">· 6 kocokan/babak</span>
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

      <div className="mb-3 flex w-fit items-center gap-1 rounded-lg border border-white/[0.07] bg-zinc-900/70 p-1">
        <button type="button" onClick={() => setView('individual')} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${view === 'individual' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>
          Individu
        </button>
        <button type="button" onClick={() => setView('teams')} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${view === 'teams' ? 'bg-emerald-400 text-emerald-950' : 'text-zinc-400 hover:text-white'}`}>
          Team · Juara Umum
        </button>
      </div>

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
      <div
        className={`${
          view === 'teams' ? 'hidden' : trimmed ? 'hidden sm:flex' : 'flex'
        } flex-1 flex-col min-h-0 overflow-hidden`}
      >
        <WinnerSummary players={visiblePlayers} />
        <AutoScrollPlayersLayout players={visiblePlayers} />
      </div>
      {view === 'teams' && !trimmed && <TeamStandings players={visiblePlayers} />}
    </div>
  );
}
