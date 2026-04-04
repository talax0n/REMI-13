'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Toaster } from 'sonner';
import ShuffleControl from './components/ShuffleControl';
import ParticipantForm from './components/ParticipantForm';
import BulkImportUploader from './components/BulkImportUploader';
import ParticipantTable from './components/ParticipantTable';
import PhaseStatus from './components/PhaseStatus';
import TableScoring from './components/TableScoring';
import PlayerQRCode from './components/PlayerQRCode';
import { Button } from '@/components/ui/button';
import { AdminParticipant, TournamentState } from './types';
import { QrCode, RotateCcw, SkipBack, Trash2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, Player } from '../components/types';
import {
  generateTables as engineGenerateTables,
  updateOpponents,
  generateTablesCompat,
  Participant as EngineParticipant,
} from '@/lib/shuffle-engine';

function buildTablesFromParticipants(parts: AdminParticipant[]): Table[] {
  const active = parts.filter((p) => p.status === 'active' && p.tableNumber !== undefined);
  const byTable = new Map<number, AdminParticipant[]>();
  active.forEach((p) => {
    const n = p.tableNumber!;
    if (!byTable.has(n)) byTable.set(n, []);
    byTable.get(n)!.push(p);
  });
  return Array.from(byTable.entries())
    .sort(([a], [b]) => a - b)
    .map(([num, players]) => ({
      id: `table-${num}`,
      number: num,
      players: [...players]
        .sort((a, b) => b.score - a.score)
        .map((p, i): Player => ({
          id: p.id,
          name: p.name,
          church: p.church,
          score: p.score,
          rank: i + 1,
          status: p.status,
        })),
    }));
}

// Extract unique churches
function extractChurches(participants: AdminParticipant[]): string[] {
  return Array.from(new Set(participants.map((p) => p.church))).sort();
}

type TabType = 'participants' | 'scoring';

export default function AdminPage() {
  const [participants, setParticipants] = useState<AdminParticipant[]>([]);
  const [tournamentState, setTournamentState] = useState<TournamentState>({
    phase: 1,
    status: 'waiting',
    totalParticipants: 0,
    totalTables: 0,
    maxPhases: 5,
  });
  const [activeTab, setActiveTab] = useState<TabType>('participants');
  const [showQRCode, setShowQRCode] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [showPhaseBackWarning, setShowPhaseBackWarning] = useState(false);
  const [showResetAllScoresWarning, setShowResetAllScoresWarning] = useState(false);
  const [loading, setLoading] = useState(true);
  // Tracks whether the initial DB load has been applied.
  // The sync useEffect must not fire for that first setParticipants call —
  // the DB already has correct state; syncing would unnecessarily overwrite tables.
  const syncEnabled = useRef(false);

  const churches = useMemo(() => extractChurches(participants), [participants]);

  // Load state from DB on mount
  useEffect(() => {
    fetch('/api/admin')
      .then((r) => r.json())
      .then((data) => {
        setParticipants(data.participants);
        setTournamentState(data.tournamentState);
        // Enable syncing only AFTER the initial load settles.
        // requestAnimationFrame ensures the participants useEffect triggered by
        // setParticipants above has already fired (and been skipped) before we
        // flip the flag, so the very next user-driven change triggers a sync.
        requestAnimationFrame(() => { syncEnabled.current = true; });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Update tournament stats
  const updateTournamentStats = useCallback(() => {
    const activeParticipants = participants.filter((p) => p.status === 'active');
    setTournamentState((prev) => ({
      ...prev,
      totalParticipants: participants.length,
      totalTables: Math.ceil(activeParticipants.length / 5),
    }));
  }, [participants]);

  // Add single participant
  const handleAddParticipant = useCallback(
    async (name: string, church: string) => {
      const newParticipant: AdminParticipant = {
        id: `participant-${Date.now()}`,
        name,
        church,
        score: 0,
        matchesPlayed: 0,
        status: 'active',
      };
      setParticipants((prev) => [...prev, newParticipant]);
      updateTournamentStats();
    },
    [updateTournamentStats]
  );

  // Bulk import participants
  const handleBulkImport = useCallback(
    async (newParticipants: Omit<AdminParticipant, 'id'>[]) => {
      const participantsWithIds = newParticipants.map((p, index) => ({
        ...p,
        id: `participant-${Date.now()}-${index}`,
      }));
      setParticipants((prev) => [...prev, ...participantsWithIds]);
      updateTournamentStats();
    },
    [updateTournamentStats]
  );

  // Shuffle tables
  const handleShuffle = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const activeParticipants = participants.filter((p) => p.status === 'active');

    // Convert to engine format, carrying over opponent history
    const engineParticipants: EngineParticipant[] = activeParticipants.map((p) => ({
      id: p.id,
      name: p.name,
      church: p.church,
      score: p.score,
      opponents: new Set(p.opponents ?? []),
    }));

    let tableGroups: EngineParticipant[][];

    try {
      const shuffleResult = engineGenerateTables(engineParticipants);
      tableGroups = shuffleResult.tables;
      // Record new opponents so future rounds respect prior matchups
      updateOpponents(tableGroups);
    } catch {
      // Fallback: plain random shuffle (e.g. count not divisible by 5)
      const pool = [...engineParticipants].sort(() => Math.random() - 0.5);
      tableGroups = [];
      for (let i = 0; i < pool.length; i += 5) tableGroups.push(pool.slice(i, i + 5));
    }

    // Build lookup maps from the engine results
    const tableNumberMap = new Map<string, number>();
    const opponentsMap = new Map<string, string[]>();
    tableGroups.forEach((group, i) => {
      group.forEach((p) => {
        tableNumberMap.set(p.id, i + 1);
        opponentsMap.set(p.id, Array.from(p.opponents));
      });
    });

    const updated = participants.map((p) => {
      if (p.status !== 'active') return p;
      return {
        ...p,
        tableNumber: tableNumberMap.get(p.id) ?? p.tableNumber,
        opponents: opponentsMap.get(p.id) ?? p.opponents,
      };
    });

    setParticipants(updated);
    // The useEffect will push updated tables to the display
  }, [participants]);

  // Complete phase and advance
  const handlePhaseComplete = useCallback(() => {
    setTournamentState((prev) => {
      const next = {
        ...prev,
        phase: Math.min(prev.phase + 1, prev.maxPhases),
        status: (prev.phase + 1 >= prev.maxPhases ? 'completed' : 'waiting') as TournamentState['status'],
      };
      fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: next.phase, status: next.status, maxPhases: next.maxPhases }),
      }).catch(console.error);
      return next;
    });
  }, []);

  // Go back to previous phase
  const handlePhaseBack = useCallback(() => {
    setTournamentState((prev) => {
      const next = {
        ...prev,
        phase: Math.max(1, prev.phase - 1),
        status: 'waiting' as TournamentState['status'],
      };
      fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: next.phase, status: next.status, maxPhases: next.maxPhases }),
      }).catch(console.error);
      return next;
    });
    setShowPhaseBackWarning(false);
  }, []);

  // Reset all scores (set all participant scores to 0)
  const handleResetAllScores = useCallback(async () => {
    setParticipants((prev) =>
      prev.map((p) => ({ ...p, score: 0, matchesPlayed: 0 }))
    );
    // Clear phase scores via API
    await fetch('/api/player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetScores: true }),
    }).catch(console.error);
    updateTournamentStats();
    setShowResetAllScoresWarning(false);
  }, [updateTournamentStats]);

  // Delete participant
  const handleDeleteParticipant = useCallback(async (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    updateTournamentStats();
  }, [updateTournamentStats]);

  // Toggle participant active status (registration fee paid)
  const handleToggleActive = useCallback(async (id: string, active: boolean) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: active ? 'active' : 'eliminated' } : p
      )
    );
    updateTournamentStats();
  }, [updateTournamentStats]);

  // Track previous phase scores to calculate differences when updating
  const [phaseScores, setPhaseScores] = useState<Record<string, Record<number, number>>>({});

  // Save scores from table scoring with phase tracking
  const handleSaveScores = useCallback(async (updates: { id: string; score: number; phase: number }[]) => {
    const phaseUpdates = updates.map((u) => {
      const participant = participants.find((p) => p.id === u.id);
      // Calculate the actual change: new score - previous score for this phase
      const previousScore = phaseScores[u.id]?.[u.phase] ?? 0;
      const scoreChange = u.score - previousScore;
      
      return {
        id: u.id,
        phase: u.phase,
        points: u.score, // Store the actual score, not the change
        tableNumber: participant?.tableNumber,
      };
    });

    // 1. Record per-phase history first so the player detail view is consistent
    await fetch('/api/player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phaseUpdates }),
    }).catch(console.error);

    // 2. Update cumulative scores in admin state using the calculated change
    setParticipants((prev) =>
      prev.map((p) => {
        const update = updates.find((u) => u.id === p.id);
        if (!update) return p;
        
        // Calculate the change from previous score for this phase
        const previousScore = phaseScores[update.id]?.[update.phase] ?? 0;
        const scoreChange = update.score - previousScore;
        
        return { ...p, score: p.score + scoreChange };
      })
    );
    
    // 3. Update phase scores tracking
    setPhaseScores((prev) => {
      const next = { ...prev };
      updates.forEach((u) => {
        if (!next[u.id]) next[u.id] = {};
        next[u.id][u.phase] = u.score;
      });
      return next;
    });
    
    updateTournamentStats();
  }, [participants, phaseScores, updateTournamentStats]);

  // Sync participants to player store and push tables to display whenever participants change.
  // Skipped for the initial DB load (syncEnabled is false at that point).
  useEffect(() => {
    if (!syncEnabled.current) return;
    const sync = async () => {
      const tables = buildTablesFromParticipants(participants);
      const fetches: Promise<unknown>[] = [
        fetch('/api/player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participants }),
        }).catch(console.error),
      ];
      // Only push tables when we have complete tables to show
      if (tables.length > 0) {
        fetches.push(
          fetch('/api/tables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tables),
          }).catch(console.error)
        );
      }
      await Promise.all(fetches);
    };
    sync();
  }, [participants]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A]">
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#1c1c1e',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fafafa',
          },
        }}
      />
      
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0B0F1A]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
                <span className="text-xl font-bold text-yellow-950">R</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Remi 13 Admin</h1>
                <p className="text-sm text-zinc-500">Tournament Control Panel</p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQRCode(true)}
                className="border-white/10 text-white hover:bg-white/10"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Player QR
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPhaseBackWarning(true)}
                  disabled={tournamentState.phase === 1}
                  className="border-white/10 text-white hover:bg-white/10 disabled:opacity-30"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                <div className="text-right">
                  <p className="text-sm text-zinc-500">Phase</p>
                  <p className="text-lg font-bold text-white">
                    {tournamentState.phase} <span className="text-zinc-500">/ {tournamentState.maxPhases}</span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResetAllScoresWarning(true)}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('participants')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'participants'
                ? 'bg-white text-black'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Participants
          </button>
          <button
            onClick={() => setActiveTab('scoring')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'scoring'
                ? 'bg-white text-black'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Table Scoring
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
        <div className="pb-6">
          {activeTab === 'participants' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column - Controls */}
              <div className="lg:col-span-4 space-y-6">
                <PhaseStatus state={tournamentState} />
                <ShuffleControl
                  state={tournamentState}
                  onShuffle={handleShuffle}
                  onPhaseComplete={handlePhaseComplete}
                />
                <ParticipantForm
                  churches={churches}
                  onAddParticipant={handleAddParticipant}
                />
                <BulkImportUploader
                  existingParticipants={participants}
                  onImport={handleBulkImport}
                />
              </div>

              {/* Right Column - Participants Table */}
              <div className="lg:col-span-8">
                <ParticipantTable
                  participants={participants}
                  churches={churches}
                  onDelete={handleDeleteParticipant}
                  onToggleActive={handleToggleActive}
                />
              </div>
            </div>
          ) : (
            <TableScoring
              currentPhase={tournamentState.phase}
              onSaveScores={handleSaveScores}
            />
          )}
        </div>
      </main>

      {/* QR Code Dialog */}
      <PlayerQRCode 
        isOpen={showQRCode} 
        onClose={() => setShowQRCode(false)} 
      />

      {/* Phase Back Warning Dialog */}
      <Dialog open={showPhaseBackWarning} onOpenChange={setShowPhaseBackWarning}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              Go Back to Previous Phase?
            </DialogTitle>
            <DialogDescription className="text-zinc-400 pt-2">
              You are about to go back from Phase {tournamentState.phase} to Phase {tournamentState.phase - 1}.
              <br /><br />
              <span className="text-yellow-400 font-medium">Warning:</span> This action should only be used if you made a mistake. Players may have already seen scores for the current phase.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowPhaseBackWarning(false)}
              className="flex-1 border-white/10 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePhaseBack}
              className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white"
            >
              <SkipBack className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset All Scores Warning Dialog */}
      <Dialog open={showResetAllScoresWarning} onOpenChange={setShowResetAllScoresWarning}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              Reset All Scores?
            </DialogTitle>
            <DialogDescription className="text-zinc-400 pt-2">
              You are about to reset <strong>ALL</strong> participant scores to zero.
              <br /><br />
              <span className="text-red-400 font-medium">This will:</span>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Clear all cumulative scores</li>
                <li>Delete all phase score history</li>
                <li>Reset the leaderboard</li>
              </ul>
              <br />
              <span className="text-red-400 font-bold">This action cannot be undone!</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowResetAllScoresWarning(false)}
              className="flex-1 border-white/10 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetAllScores}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
