'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  AlertCircle, 
  TrendingUp,
  Clock,
  Hash,
  Users,
  Medal,
  Crown,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PlayerScore, PlayerView, LoginFormData } from './types';
import { getTeamColor } from '../components/team-style';

const MAX_PHASES = 6;

function getTeamStyle(team: string) {
  return getTeamColor(team);
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-zinc-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-zinc-500 font-bold">#{rank}</span>;
}


// Login Form Component
function LoginForm({
  onSubmit,
  loading,
  players,
}: {
  onSubmit: (data: LoginFormData) => void;
  loading: boolean;
  players: Array<{ name: string; team: string }>;
}) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<{ name: string; team: string } | null>(null);
  const [error, setError] = useState<'empty' | 'notfound' | 'ambiguous' | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredPlayers = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return [];
    return players
      .filter((p) => p.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const an = a.name.toLowerCase();
        const bn = b.name.toLowerCase();
        const aStarts = an.startsWith(q) ? 0 : 1;
        const bStarts = bn.startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return an.localeCompare(bn);
      })
      .slice(0, 8);
  }, [name, players]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    setShowSuggestions(!!value.trim());
    setError(null);
    if (selected && selected.name.toLowerCase() !== value.trim().toLowerCase()) {
      setSelected(null);
    }
  };

  const handleSelect = (pick: { name: string; team: string }) => {
    setSelected(pick);
    setName(pick.name);
    setShowSuggestions(false);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    const trimmed = name.trim();
    if (!trimmed) {
      setError('empty');
      return;
    }
    if (selected && selected.name.toLowerCase() === trimmed.toLowerCase()) {
      onSubmit({ name: selected.name, team: selected.team });
      return;
    }
    const exact = players.filter((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (exact.length === 1) {
      onSubmit({ name: exact[0].name, team: exact[0].team });
    } else if (exact.length > 1) {
      setError('ambiguous');
      setShowSuggestions(true);
    } else {
      setError('notfound');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-dvh bg-[#0B0F1A] p-4 flex items-start justify-center overflow-y-auto overflow-x-hidden pt-8 pb-[max(8rem,env(safe-area-inset-bottom))]"
    >
      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
          >
            <img src="/LOGO.png" alt="Remi 13 Logo" className="w-20 h-20 rounded-2xl object-contain" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Remi 13 - DS Cileungsi</h1>
          <p className="text-zinc-400">Check your tournament scores</p>
        </div>

        {/* Login Form */}
        <Card className="bg-zinc-900/50 border-white/10 overflow-hidden">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Input with Search */}
              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-500" />
                  Your Name
                </label>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    type="text"
                    value={name}
                    onChange={handleNameChange}
                    onFocus={() => name.trim() && filteredPlayers.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Type your name..."
                    autoComplete="off"
                    className={`bg-zinc-800/50 border-white/10 text-white h-12 text-lg pr-10 ${
                      error ? 'border-red-500/50 focus:border-red-500' : ''
                    }`}
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
                </div>

                {/* Selected team chip */}
                {selected && (
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span>Team:</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium ${getTeamStyle(selected.team).bg} ${getTeamStyle(selected.team).text}`}
                    >
                      <Hash className="w-3 h-3" />
                      {selected.team}
                    </span>
                  </div>
                )}

                {/* Search Suggestions */}
                <AnimatePresence>
                  {showSuggestions && filteredPlayers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 left-0 right-0 top-full mt-1 bg-zinc-800 border border-white/10 rounded-lg shadow-xl overflow-y-auto max-h-[50vh]"
                    >
                      {filteredPlayers.map((p, index) => {
                        const ts = getTeamStyle(p.team);
                        return (
                          <button
                            key={`${p.name}__${p.team}`}
                            type="button"
                            onClick={() => handleSelect(p)}
                            onMouseDown={(e) => e.preventDefault()}
                            className={`
                              w-full px-4 py-3 text-left text-white text-sm
                              hover:bg-zinc-700/50 active:bg-zinc-700 transition-colors flex items-center gap-3
                              ${index !== filteredPlayers.length - 1 ? 'border-b border-white/5' : ''}
                            `}
                          >
                            <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${ts.bg}`}>
                              <Users className={`w-4 h-4 ${ts.text}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate leading-tight">{p.name}</p>
                              <p className={`text-[11px] truncate ${ts.text} opacity-90`}>{p.team}</p>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {error === 'empty' && (
                  <p className="text-red-400 text-sm flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Please enter your name
                  </p>
                )}
                {error === 'notfound' && (
                  <p className="text-red-400 text-sm flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    No player matches that name
                  </p>
                )}
                {error === 'ambiguous' && (
                  <p className="text-amber-400 text-sm flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Multiple players found — pick yours from the list
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold text-lg transition-transform"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Searching...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Find My Scores
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Hint */}
        <p className="text-center text-zinc-500 text-sm mt-6">
          Scan the QR code at your table to access this page
        </p>
      </div>
    </motion.div>
  );
}

// Not Found View
function NotFoundView({ onBack }: { onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-dvh bg-[#0B0F1A] p-4 flex items-center justify-center overflow-y-auto"
    >
      <div className="w-full max-w-md text-center">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-6"
        >
          <AlertCircle className="w-12 h-12 text-zinc-500" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">Player Not Found</h2>
        <p className="text-zinc-400 mb-6">
          We couldn&apos;t find a player with that name and team combination. Please check your details and try again.
        </p>
        <Button
          onClick={onBack}
          className="bg-white text-black hover:bg-zinc-200 font-semibold"
        >
          <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
          Go Back
        </Button>
      </div>
    </motion.div>
  );
}

// Player Profile View
function PlayerProfile({
  player,
  onBack,
  tournamentPhase,
  semifinalPhase,
}: {
  player: PlayerScore;
  onBack: () => void;
  tournamentPhase: number;
  semifinalPhase: number;
}) {
  const teamStyle = getTeamStyle(player.team);
  const phases = Object.entries(player.scores).sort(([a], [b]) => parseInt(a) - parseInt(b));
  const completedPhases = phases.length;
  const regularTotal = phases.reduce(
    (sum, [phase, data]) => parseInt(phase) < semifinalPhase ? sum + data.points : sum,
    0
  );
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-dvh bg-[#0B0F1A] overflow-y-auto overflow-x-hidden"
    >
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0B0F1A]/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-zinc-400 hover:text-white"
            >
              <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
              Back
            </Button>
            <Badge className={`${teamStyle.bg} ${teamStyle.text} ${teamStyle.border} border`}>
              {player.team}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* Player Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border border-white/10 p-4"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 truncate">{player.name}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${teamStyle.bg} ${teamStyle.text} max-w-[60vw] truncate`}>
                    {player.team}
                  </span>
                  {player.status === 'winner' && (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      <Crown className="w-3 h-3 mr-1" />
                      Champion
                    </Badge>
                  )}
                </div>
              </div>
              {player.rank && (
                <div className="flex flex-col items-center shrink-0">
                  {getRankIcon(player.rank)}
                  <span className="text-xs text-zinc-500 mt-1">Rank</span>
                </div>
              )}
            </div>

            {/* Total Score */}
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {player.totalScore.toLocaleString()}
              </span>
              <span className="text-zinc-500 text-sm">pts</span>
            </div>
          </div>
        </motion.div>

        {/* Phase Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Babak Progress
            </h3>
            <span className="text-sm text-zinc-500">
              {completedPhases}/{MAX_PHASES} completed
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(completedPhases / MAX_PHASES) * 100}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
            />
          </div>

          {/* Phase Cards */}
          <div className="space-y-3">
            {Array.from({ length: MAX_PHASES }, (_, i) => i + 1).map((phaseNum, index) => {
              const phaseData = player.scores[phaseNum];
              const isCompleted = !!phaseData;
              const isCurrent = !isCompleted && tournamentPhase === phaseNum;
              const tableNum = isCompleted
                ? phaseData.tableNumber
                : isCurrent
                  ? player.currentTable
                  : undefined;

              return (
                <motion.div
                  key={phaseNum}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className={`
                    relative overflow-hidden rounded-lg border p-3 transition-all duration-200
                    ${isCompleted
                      ? 'bg-zinc-800/30 border-emerald-500/20'
                      : isCurrent
                        ? 'bg-zinc-800/40 border-amber-500/30'
                        : 'bg-zinc-900/30 border-white/5'
                    }
                  `}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Phase Number */}
                      <div className={`
                        w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl flex items-center justify-center text-sm font-bold
                        ${isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                            ? 'bg-amber-500 text-amber-950'
                            : 'bg-zinc-800 text-zinc-500'
                        }
                      `}>
                        {phaseNum}
                      </div>

                      {/* Phase Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white leading-tight">Babak {phaseNum}</p>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              Now playing
                            </span>
                          )}
                        </div>
                        {tableNum ? (
                          <span
                            className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium border ${
                              isCompleted
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-200 border-amber-500/30'
                            }`}
                          >
                            <Hash className="w-3 h-3 shrink-0" />
                            <span className="truncate">Table {tableNum}</span>
                          </span>
                        ) : (
                          !isCompleted && (
                            <p className="mt-1 text-[11px] text-zinc-500">Table not yet assigned</p>
                          )
                        )}
                      </div>
                    </div>

                    {/* Score or Pending */}
                    <div className="text-right shrink-0">
                      {isCompleted ? (
                        <>
                          <p className={`text-base sm:text-lg font-bold tabular-nums ${phaseData.points < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {phaseData.points < 0 ? '' : '+'}{phaseData.points.toLocaleString()}
                          </p>
                          <p className="text-[10px] sm:text-xs text-zinc-500">
                            {new Date(phaseData.timestamp).toLocaleDateString()}
                          </p>
                        </>
                      ) : (
                        <div className={`flex items-center gap-1.5 ${isCurrent ? 'text-amber-300' : 'text-zinc-500'}`}>
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{isCurrent ? 'In progress' : 'Pending'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Completion indicator */}
                  {isCompleted && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full" />
                  )}
                  {isCurrent && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-500/15 to-transparent rounded-bl-full" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-900/30 border border-white/10 rounded-lg p-4"
        >
          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-white tabular-nums">{completedPhases}</p>
              <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider">Babak</p>
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-emerald-400 tabular-nums">
                {player.rank ? `#${player.rank}` : '-'}
              </p>
              <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider">Rank</p>
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-white tabular-nums truncate">
                {regularTotal.toLocaleString()}
              </p>
              <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider">Regular Points</p>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-zinc-600 text-sm">
          Remi 13 Tournament • Good luck!
        </p>
      </div>
    </motion.div>
  );
}

// Main Page Component
export default function PlayerPage() {
  const [view, setView] = useState<PlayerView>('login');
  const [player, setPlayer] = useState<PlayerScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [allPlayers, setAllPlayers] = useState<PlayerScore[]>([]);
  const [tournamentPhase, setTournamentPhase] = useState(1);
  const [semifinalPhase, setSemifinalPhase] = useState(5);

  // Poll tournament phase so the profile can highlight the active phase.
  useEffect(() => {
    let cancelled = false;
    async function fetchPhase() {
      try {
        const res = await fetch('/api/admin');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.tournamentState?.phase) {
          setTournamentPhase(data.tournamentState.phase);
          setSemifinalPhase(data.tournamentState.semifinalPhase ?? 5);
        }
      } catch {
        // ignore
      }
    }
    fetchPhase();
    const interval = setInterval(fetchPhase, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Poll the same public player API the leaderboard uses.
  // - Populates the name/team search from real player data.
  // - Keeps the profile view in sync when admin records scores.
  useEffect(() => {
    let cancelled = false;
    async function fetchPlayers() {
      try {
        const response = await fetch('/api/player', { cache: 'no-store' });
        if (!response.ok) return;
        const data: PlayerScore[] = await response.json();
        if (cancelled) return;
        if (!Array.isArray(data)) return;
        setAllPlayers(data);
        // Update the displayed profile with fresh score + live rank
        setPlayer((prev) => {
          if (!prev) return prev;
          const idx = data.findIndex((p) => p.id === prev.id);
          if (idx === -1) return prev;
          return { ...data[idx], rank: idx + 1 };
        });
      } catch {
        // keep the last good snapshot visible
      }
    }
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Derived from live stream — same source as the leaderboard
  const playerOptions = useMemo(
    () => allPlayers.map((p) => ({ name: p.name, team: p.team })),
    [allPlayers],
  );

  const handleLogin = useCallback(async (data: LoginFormData) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/player?name=${encodeURIComponent(data.name)}&team=${encodeURIComponent(data.team)}`
      );
      if (response.ok) {
        const playerData: PlayerScore = await response.json();
        // Derive rank from the live sorted list so it's consistent with the leaderboard
        const idx = allPlayers.findIndex((p) => p.id === playerData.id);
        setPlayer({ ...playerData, rank: idx >= 0 ? idx + 1 : playerData.rank });
        setView('profile');
      } else {
        setView('not-found');
      }
    } catch {
      setView('not-found');
    } finally {
      setLoading(false);
    }
  }, [allPlayers]);

  const handleBack = useCallback(() => {
    setView('login');
    setPlayer(null);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {view === 'login' && (
        <LoginForm
          key="login"
          onSubmit={handleLogin}
          loading={loading}
          players={playerOptions}
        />
      )}

      {view === 'not-found' && (
        <NotFoundView key="not-found" onBack={handleBack} />
      )}

      {view === 'profile' && player && (
        <PlayerProfile
          key="profile"
          player={player}
          onBack={handleBack}
          tournamentPhase={tournamentPhase}
          semifinalPhase={semifinalPhase}
        />
      )}
    </AnimatePresence>
  );
}
