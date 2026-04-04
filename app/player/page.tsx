'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Search, 
  AlertCircle, 
  ChevronRight, 
  TrendingUp,
  Award,
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
import { churchColors, defaultChurchColor } from '../components/participants';

const MAX_PHASES = 5;

function getChurchStyle(church: string) {
  return churchColors[church] || defaultChurchColor;
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
  churches,
  availableParticipants
}: { 
  onSubmit: (data: LoginFormData) => void; 
  loading: boolean;
  churches: string[];
  availableParticipants: string[];
}) {
  const [name, setName] = useState('');
  const [church, setChurch] = useState('');
  const [errors, setErrors] = useState({ name: false, church: false });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredNames, setFilteredNames] = useState<string[]>([]);
  const [showChurchSuggestions, setShowChurchSuggestions] = useState(false);
  const [filteredChurches, setFilteredChurches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter names based on input
  useEffect(() => {
    if (name.trim()) {
      const filtered = availableParticipants.filter(p => 
        p.toLowerCase().includes(name.toLowerCase()) && 
        p.toLowerCase() !== name.toLowerCase()
      ).slice(0, 5);
      setFilteredNames(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [name, availableParticipants]);

  // Filter churches based on input
  useEffect(() => {
    if (church.trim()) {
      const filtered = churches.filter(c => 
        c.toLowerCase().includes(church.toLowerCase()) && 
        c.toLowerCase() !== church.toLowerCase()
      ).slice(0, 5);
      setFilteredChurches(filtered);
      setShowChurchSuggestions(filtered.length > 0);
    } else {
      setShowChurchSuggestions(false);
      setFilteredChurches([]);
    }
  }, [church, churches]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setErrors(prev => ({ ...prev, name: false }));
  };

  const handleSelectName = (selectedName: string) => {
    setName(selectedName);
    setShowSuggestions(false);
  };

  const handleChurchChange = (value: string) => {
    setChurch(value);
    setErrors(prev => ({ ...prev, church: false }));
  };

  const handleSelectChurch = (selectedChurch: string) => {
    setChurch(selectedChurch);
    setShowChurchSuggestions(false);
    setErrors(prev => ({ ...prev, church: false }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    setShowChurchSuggestions(false);
    const newErrors = {
      name: !name.trim(),
      church: !church.trim(),
    };
    setErrors(newErrors);
    
    if (!newErrors.name && !newErrors.church) {
      onSubmit({ name, church });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-[#0B0F1A] p-4 flex items-start justify-center overflow-y-auto pt-8 pb-32"
    >
      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-yellow-500/20"
          >
            <Trophy className="w-10 h-10 text-yellow-950" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Remi 13</h1>
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
                    onFocus={() => name.trim() && filteredNames.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Type your name..."
                    autoComplete="off"
                    className={`bg-zinc-800/50 border-white/10 text-white h-12 text-lg pr-10 ${
                      errors.name ? 'border-red-500/50 focus:border-red-500' : ''
                    }`}
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
                </div>
                
                {/* Search Suggestions */}
                <AnimatePresence>
                  {showSuggestions && filteredNames.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 left-0 right-0 top-full mt-1 bg-zinc-800 border border-white/10 rounded-lg shadow-xl overflow-hidden"
                    >
                      {filteredNames.map((suggestion, index) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleSelectName(suggestion)}
                          onMouseDown={(e) => e.preventDefault()}
                          className={`
                            w-full px-4 py-3 text-left text-white text-sm
                            hover:bg-zinc-700/50 transition-colors flex items-center gap-3
                            ${index !== filteredNames.length - 1 ? 'border-b border-white/5' : ''}
                          `}
                        >
                          <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center">
                            <Users className="w-4 h-4 text-zinc-400" />
                          </div>
                          <span className="font-medium">{suggestion}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {errors.name && (
                  <p className="text-red-400 text-sm flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Please enter your name
                  </p>
                )}
              </div>

              {/* Church Selection with Search */}
              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-zinc-500" />
                  Your Church
                </label>
                
                {/* Church Input */}
                <div className="relative">
                  <Input
                    type="text"
                    value={church}
                    onChange={(e) => handleChurchChange(e.target.value)}
                    onFocus={() => church.trim() && filteredChurches.length > 0 && setShowChurchSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowChurchSuggestions(false), 200)}
                    placeholder="Type or select your church..."
                    autoComplete="off"
                    className={`bg-zinc-800/50 border-white/10 text-white h-12 text-lg pr-10 ${
                      errors.church ? 'border-red-500/50 focus:border-red-500' : ''
                    }`}
                  />
                  <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
                </div>
                
                {/* Church Search Suggestions */}
                <AnimatePresence>
                  {showChurchSuggestions && filteredChurches.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 left-0 right-0 top-full mt-1 bg-zinc-800 border border-white/10 rounded-lg shadow-xl overflow-hidden"
                    >
                      {filteredChurches.map((suggestion, index) => {
                        const churchStyle = getChurchStyle(suggestion);
                        return (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => handleSelectChurch(suggestion)}
                            onMouseDown={(e) => e.preventDefault()}
                            className={`
                              w-full px-4 py-3 text-left text-white text-sm
                              hover:bg-zinc-700/50 transition-colors flex items-center gap-3
                              ${index !== filteredChurches.length - 1 ? 'border-b border-white/5' : ''}
                            `}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${churchStyle.bg}`}>
                              <Hash className={`w-4 h-4 ${churchStyle.text}`} />
                            </div>
                            <div className="flex-1">
                              <span className="font-medium">{suggestion}</span>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Quick Select Grid (shows when input is empty) */}
                {!church && !showChurchSuggestions && (
                  <div className="pt-2">
                    <p className="text-xs text-zinc-500 mb-2">Quick select:</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {churches.slice(0, 8).map((churchName) => {
                        const churchStyle = getChurchStyle(churchName);
                        return (
                          <button
                            key={churchName}
                            type="button"
                            onClick={() => handleSelectChurch(churchName)}
                            className={`
                              px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200
                              ${churchStyle.bg} ${churchStyle.text} ${churchStyle.border} border
                              hover:opacity-80
                            `}
                          >
                            {churchName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {errors.church && (
                  <p className="text-red-400 text-sm flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Please select your church
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-lg"
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
      className="min-h-screen bg-[#0B0F1A] p-4 flex items-center justify-center"
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
          We couldn't find a player with that name and church combination. Please check your details and try again.
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
  onBack 
}: { 
  player: PlayerScore; 
  onBack: () => void;
}) {
  const churchStyle = getChurchStyle(player.church);
  const phases = Object.entries(player.scores).sort(([a], [b]) => parseInt(a) - parseInt(b));
  const completedPhases = phases.length;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-screen bg-[#0B0F1A] overflow-y-auto overflow-x-hidden"
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
            <Badge className={`${churchStyle.bg} ${churchStyle.text} ${churchStyle.border} border`}>
              {player.church}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-safe">
        {/* Player Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border border-white/10 p-4"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">{player.name}</h1>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${churchStyle.bg} ${churchStyle.text}`}>
                    {player.church}
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
                <div className="flex flex-col items-center">
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
              Phase Progress
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
                      : 'bg-zinc-900/30 border-white/5'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Phase Number */}
                      <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold
                        ${isCompleted 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-zinc-800 text-zinc-500'
                        }
                      `}>
                        {phaseNum}
                      </div>
                      
                      {/* Phase Info */}
                      <div>
                        <p className="font-semibold text-white">Phase {phaseNum}</p>
                        {isCompleted && phaseData.tableNumber && (
                          <p className="text-xs text-zinc-400 flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            Table {phaseData.tableNumber}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Score or Pending */}
                    <div className="text-right">
                      {isCompleted ? (
                        <>
                          <p className={`text-lg font-bold ${phaseData.points < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {phaseData.points < 0 ? '' : '+'}{phaseData.points.toLocaleString()}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {new Date(phaseData.timestamp).toLocaleDateString()}
                          </p>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-zinc-500">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">Pending</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Completion indicator */}
                  {isCompleted && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full" />
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
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{completedPhases}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Phases</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">
                {player.rank ? `#${player.rank}` : '-'}
              </p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Rank</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {phases.length > 0 
                  ? Math.round(phases.reduce((sum, [, data]) => sum + data.points, 0) / phases.length).toLocaleString()
                  : '0'
                }
              </p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Avg/Phase</p>
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

  // Subscribe to the same live stream the leaderboard uses.
  // - Populates the name/church search from real player data.
  // - Keeps the profile view in sync when admin records scores.
  useEffect(() => {
    const es = new EventSource('/api/player/stream');
    es.onmessage = (e) => {
      try {
        const data: PlayerScore[] = JSON.parse(e.data);
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
        // ignore malformed events
      }
    };
    return () => es.close();
  }, []);

  // Derived from live stream — same source as the leaderboard
  const availableParticipants = allPlayers.map((p) => p.name).sort();
  const churches = Array.from(new Set(allPlayers.map((p) => p.church))).sort();

  const handleLogin = useCallback(async (data: LoginFormData) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/player?name=${encodeURIComponent(data.name)}&church=${encodeURIComponent(data.church)}`
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
          churches={churches}
          availableParticipants={availableParticipants}
        />
      )}

      {view === 'not-found' && (
        <NotFoundView key="not-found" onBack={handleBack} />
      )}

      {view === 'profile' && player && (
        <PlayerProfile key="profile" player={player} onBack={handleBack} />
      )}
    </AnimatePresence>
  );
}
