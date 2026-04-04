'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
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
import { QrCode } from 'lucide-react';
import { Table, Player } from '../components/types';
import { participants as initialParticipants } from '../components/participants';
import {
  generateTables as engineGenerateTables,
  updateOpponents,
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
    .filter(([, players]) => players.length === 5)
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

// Generate initial admin participants from the data
function generateInitialParticipants(): AdminParticipant[] {
  return initialParticipants.map((p, index) => ({
    id: `participant-${index}`,
    name: p.name,
    church: p.church,
    score: Math.floor(Math.random() * 5000) + 5000,
    matchesPlayed: Math.floor(Math.random() * 10),
    status: p.active ? 'active' : 'eliminated',
    tableNumber: p.active ? Math.floor(index / 5) + 1 : undefined,
  }));
}

// Extract unique churches
function extractChurches(participants: AdminParticipant[]): string[] {
  return Array.from(new Set(participants.map((p) => p.church))).sort();
}

type TabType = 'participants' | 'scoring';

export default function AdminPage() {
  const [participants, setParticipants] = useState<AdminParticipant[]>(generateInitialParticipants());
  const [tournamentState, setTournamentState] = useState<TournamentState>({
    phase: 1,
    status: 'waiting',
    totalParticipants: initialParticipants.length,
    totalTables: Math.ceil(initialParticipants.filter(p => p.active).length / 5),
    maxPhases: 5,
  });
  const [activeTab, setActiveTab] = useState<TabType>('participants');
  const [showQRCode, setShowQRCode] = useState(false);

  const churches = useMemo(() => extractChurches(participants), [participants]);

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
      tableGroups = engineGenerateTables(engineParticipants, { fallbackRelaxRepeat: true });
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
    setTournamentState((prev) => ({
      ...prev,
      phase: Math.min(prev.phase + 1, prev.maxPhases),
      status: prev.phase + 1 >= prev.maxPhases ? 'completed' : 'waiting',
    }));
  }, []);

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

  // Save scores from table scoring
  const handleSaveScores = useCallback(async (updates: { id: string; score: number }[]) => {
    setParticipants((prev) =>
      prev.map((p) => {
        const update = updates.find((u) => u.id === p.id);
        if (update) {
          return { ...p, score: p.score + update.score };
        }
        return p;
      })
    );
    updateTournamentStats();
  }, [updateTournamentStats]);

  // Sync participants to player store and push tables to display whenever participants change
  useEffect(() => {
    const sync = async () => {
      const tables = buildTablesFromParticipants(participants);
      await Promise.all([
        fetch('/api/player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participants }),
        }).catch(console.error),
        fetch('/api/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tables),
        }).catch(console.error),
      ]);
    };
    sync();
  }, [participants]);

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
              <div className="text-right">
                <p className="text-sm text-zinc-500">Phase</p>
                <p className="text-lg font-bold text-white">
                  {tournamentState.phase} <span className="text-zinc-500">/ {tournamentState.maxPhases}</span>
                </p>
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
              participants={participants}
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
    </div>
  );
}
