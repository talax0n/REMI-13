'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import ShuffleControl from './components/ShuffleControl';
import ParticipantForm from './components/ParticipantForm';
import BulkImportUploader from './components/BulkImportUploader';
import ParticipantTable from './components/ParticipantTable';
import PhaseStatus from './components/PhaseStatus';
import PhaseConfig from './components/PhaseConfig';
import TableScoring from './components/TableScoring';
import PlayerQRCode from './components/PlayerQRCode';
import { Button } from '@/components/ui/button';
import { AdminParticipant, TournamentState } from './types';
import { Download, QrCode, RotateCcw, SkipBack, Trash2, AlertTriangle, LogOut, MoreVertical, Users, Calculator, UserPlus, FileSpreadsheet } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
  Participant as EngineParticipant,
} from '@/lib/shuffle-engine';
import { recordTableOpponentHistory } from '@/lib/opponent-history';

function getPhaseAwareScore(
  participant: AdminParticipant,
  phaseScores: Record<string, Record<number, number>>,
  phase: number,
  semifinalPhase: number
) {
  if (phase < semifinalPhase) return participant.score;
  return phaseScores[participant.id]?.[phase] ?? 0;
}

function buildTablesFromParticipants(
  parts: AdminParticipant[],
  phaseScores: Record<string, Record<number, number>> = {},
  phase = 1,
  semifinalPhase = 5
): Table[] {
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
        .sort((a, b) => getPhaseAwareScore(b, phaseScores, phase, semifinalPhase) - getPhaseAwareScore(a, phaseScores, phase, semifinalPhase))
        .map((p, i): Player => ({
          id: p.id,
          name: p.name,
          team: p.team,
          score: getPhaseAwareScore(p, phaseScores, phase, semifinalPhase),
          rank: i + 1,
          status: p.status,
        }))
        .concat(createDummyPlayersForTable(num, players.length)),
    }));
}

function createDummyPlayersForTable(tableNumber: number, playerCount: number): Player[] {
  return Array.from({ length: Math.max(0, 5 - playerCount) }, (_, index) => ({
    id: `dummy-table-${tableNumber}-${index + 1}`,
    name: `Dummy ${index + 1}`,
    team: 'Dummy',
    score: 0,
    rank: playerCount + index + 1,
    status: 'dummy',
    isDummy: true,
  }));
}

// Extract unique teams
function extractTeams(participants: AdminParticipant[]): string[] {
  return Array.from(new Set(participants.map((p) => p.team))).sort();
}

type TabType = 'participants' | 'scoring';

function MobileMenuItem({
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  tone?: 'amber' | 'red';
}) {
  const color =
    tone === 'amber'
      ? 'text-amber-400 hover:bg-amber-500/10'
      : tone === 'red'
        ? 'text-red-400 hover:bg-red-500/10'
        : 'text-zinc-200 hover:bg-white/10';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${color}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

export default function AdminPage() {
  const [participants, setParticipants] = useState<AdminParticipant[]>([]);
  const [tournamentState, setTournamentState] = useState<TournamentState>({
    phase: 1,
    status: 'waiting',
    totalParticipants: 0,
    totalTables: 0,
    maxPhases: 6,
    semifinalPhase: 5,
    finalPhase: 6,
    isFinalPhase: false,
    semifinalCutoff: 20,
    finalCutoff: 10,
  });
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window === 'undefined') return 'participants';
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'scoring' || params.has('table') ? 'scoring' : 'participants';
  });
  const [showQRCode, setShowQRCode] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [showPhaseBackWarning, setShowPhaseBackWarning] = useState(false);
  const [showResetAllScoresWarning, setShowResetAllScoresWarning] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [phaseScores, setPhaseScores] = useState<Record<string, Record<number, number>>>({});
  const [semifinalCutoff, setSemifinalCutoff] = useState<10 | 20>(20);
  const [finalCutoff, setFinalCutoff] = useState<5 | 10>(10);
  // Tracks whether the initial DB load has been applied.
  // The sync useEffect must not fire for that first setParticipants call —
  // the DB already has correct state; syncing would unnecessarily overwrite tables.
  const syncEnabled = useRef(false);
  const lastLocalMutationAt = useRef(0);
  const isPollingRef = useRef(false);

  const teams = useMemo(() => extractTeams(participants), [participants]);
  const seatedActiveParticipants = useMemo(
    () =>
      participants.filter(
        (p) => p.status === 'active' && p.tableNumber !== undefined
      ),
    [participants]
  );
  const seatedActiveScoredCount = useMemo(
    () =>
      seatedActiveParticipants.filter(
        (p) => phaseScores[p.id]?.[tournamentState.phase] !== undefined
      ).length,
    [phaseScores, seatedActiveParticipants, tournamentState.phase]
  );
  const currentPhaseHasScores =
    seatedActiveParticipants.length > 0
    && seatedActiveScoredCount === seatedActiveParticipants.length;
  const shuffleTargetPhase = currentPhaseHasScores
    ? Math.min(tournamentState.phase + 1, tournamentState.maxPhases)
    : tournamentState.phase;

  const persistTournamentState = useCallback((
    next: TournamentState,
    nextSemifinalCutoff = semifinalCutoff,
    nextFinalCutoff = finalCutoff
  ) => {
    fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: next.phase,
        status: next.status,
        maxPhases: next.maxPhases,
        semifinalPhase: next.semifinalPhase,
        finalPhase: next.finalPhase,
        semifinalCutoff: nextSemifinalCutoff,
        finalCutoff: nextFinalCutoff,
      }),
    }).catch(console.error);
  }, [finalCutoff, semifinalCutoff]);

  // Apply server state without re-triggering the local sync push effect.
  const applyServerState = useCallback((data: {
    participants: AdminParticipant[];
    tournamentState: TournamentState;
    phaseScores?: Record<string, Record<number, number>>;
  }) => {
    const wasEnabled = syncEnabled.current;
    syncEnabled.current = false;
    setParticipants(data.participants);
    setTournamentState(data.tournamentState);
    setPhaseScores(data.phaseScores ?? {});
    setSemifinalCutoff(data.tournamentState.semifinalCutoff ?? 20);
    setFinalCutoff(data.tournamentState.finalCutoff ?? 10);
    requestAnimationFrame(() => { syncEnabled.current = wasEnabled; });
  }, []);

  // Load state from DB on mount
  useEffect(() => {
    fetch('/api/admin')
      .then((r) => r.json())
      .then((data) => {
        applyServerState(data);
        // Enable syncing only AFTER the initial load settles.
        // requestAnimationFrame ensures the participants useEffect triggered by
        // setParticipants above has already fired (and been skipped) before we
        // flip the flag, so the very next user-driven change triggers a sync.
        requestAnimationFrame(() => { syncEnabled.current = true; });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [applyServerState]);

  // Poll /api/admin so changes from other admin clients propagate without a manual refresh.
  // Skipped when the tab is hidden, when a poll is already in flight, or when a local
  // mutation fired recently (the local change is still being pushed up and pulling now
  // would race against it).
  useEffect(() => {
    const POLL_MS = 5000;
    const MUTATION_COOLDOWN_MS = 2500;

    const refresh = async () => {
      if (isPollingRef.current) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      if (Date.now() - lastLocalMutationAt.current < MUTATION_COOLDOWN_MS) return;
      isPollingRef.current = true;
      try {
        const res = await fetch('/api/admin', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (Date.now() - lastLocalMutationAt.current < MUTATION_COOLDOWN_MS) return;
        applyServerState(data);
      } catch {
        // ignore transient errors
      } finally {
        isPollingRef.current = false;
      }
    };

    const interval = setInterval(refresh, POLL_MS);
    const onVisibility = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', refresh);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', refresh);
    };
  }, [applyServerState]);

  // Update tournament stats
  const updateTournamentStats = useCallback(() => {
    const activeParticipants = participants.filter((p) => p.status === 'active');
    setTournamentState((prev) => ({
      ...prev,
      totalParticipants: activeParticipants.length,
      totalTables: Math.ceil(activeParticipants.length / 5),
    }));
  }, [participants]);

  // Add single participant
  const handleAddParticipant = useCallback(
    async (name: string, team: string) => {
      const newParticipant: AdminParticipant = {
        id: `participant-${Date.now()}`,
        name,
        team,
        score: 0,
        matchesPlayed: 0,
        status: 'active',
      };
      const nextParticipants = [...participants, newParticipant];
      setParticipants(nextParticipants);
      setTournamentState((prev) => ({
        ...prev,
        totalParticipants: nextParticipants.filter((p) => p.status === 'active').length,
        totalTables: Math.ceil(nextParticipants.filter((p) => p.status === 'active').length / 5),
      }));
    },
    [participants]
  );

  // Bulk import participants
  const handleBulkImport = useCallback(
    async (newParticipants: Omit<AdminParticipant, 'id'>[]) => {
      const participantsWithIds = newParticipants.map((p, index) => ({
        ...p,
        id: `participant-${Date.now()}-${index}`,
      }));
      const nextParticipants = [...participants, ...participantsWithIds];
      const activeCount = nextParticipants.filter((p) => p.status === 'active').length;
      const response = await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: nextParticipants }),
      });

      if (!response.ok) {
        throw new Error('Failed to save imported participants');
      }

      setParticipants(nextParticipants);
      setTournamentState((prev) => ({
        ...prev,
        totalParticipants: activeCount,
        totalTables: Math.ceil(activeCount / 5),
      }));
    },
    [participants]
  );

  // Shuffle tables
  const handleShuffle = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const participantsWithCurrentHistory = recordTableOpponentHistory(participants);

    // Final phase → top N (cutoff-defined finalists)
    if (shuffleTargetPhase === tournamentState.finalPhase) {
      const sorted = [...participantsWithCurrentHistory]
        .filter((p) => p.status === 'active')
        .sort(
          (a, b) =>
            getPhaseAwareScore(b, phaseScores, tournamentState.semifinalPhase, tournamentState.semifinalPhase)
            - getPhaseAwareScore(a, phaseScores, tournamentState.semifinalPhase, tournamentState.semifinalPhase)
        );

      const finalists = sorted.slice(0, finalCutoff);

      if (finalists.length < finalCutoff) {
        throw new Error(`Butuh minimal ${finalCutoff} pemain aktif untuk babak final`);
      }

      const engineParticipants: EngineParticipant[] = finalists.map((p) => ({
        id: p.id,
        name: p.name,
        team: p.team,
        score: getPhaseAwareScore(p, phaseScores, tournamentState.semifinalPhase, tournamentState.semifinalPhase),
        opponents: new Set(p.opponents ?? []),
      }));

      const shuffleResult = engineGenerateTables(engineParticipants);
      const tableGroups = shuffleResult.tables;
      updateOpponents(tableGroups);

      const tableNumberMap = new Map<string, number>();
      const opponentsMap = new Map<string, string[]>();
      tableGroups.forEach((group, i) => {
        group.forEach((p) => {
          tableNumberMap.set(p.id, i + 1);
          opponentsMap.set(p.id, Array.from(p.opponents));
        });
      });

      const updated = participantsWithCurrentHistory.map((p) => {
        const tableNum = tableNumberMap.get(p.id);
        if (tableNum) {
          return {
            ...p,
            tableNumber: tableNum,
            opponents: opponentsMap.get(p.id) ?? p.opponents,
            eliminatedAtPhase: undefined,
          };
        }
        if (p.status === 'active') return { ...p, status: 'eliminated' as const, tableNumber: undefined, eliminatedAtPhase: tournamentState.semifinalPhase };
        return p;
      });

      setParticipants(updated);
      setTournamentState((prev) => ({
        ...prev,
        isFinalPhase: true,
        totalTables: Math.ceil(finalCutoff / 5),
        finalTableA: undefined,
        finalTableB: undefined,
      }));
      return { warnings: shuffleResult.warnings };
    }

    // Semifinal phase → top N (cutoff-defined semifinalists)
    if (shuffleTargetPhase === tournamentState.semifinalPhase) {
      const sorted = [...participantsWithCurrentHistory]
        .filter((p) => p.status === 'active')
        .sort((a, b) => b.score - a.score);

      const semifinalists = sorted.slice(0, semifinalCutoff);

      if (semifinalists.length < semifinalCutoff) {
        throw new Error(`Butuh minimal ${semifinalCutoff} pemain aktif untuk babak semifinal`);
      }

      const engineParticipants: EngineParticipant[] = semifinalists.map((p) => ({
        id: p.id,
        name: p.name,
        team: p.team,
        score: p.score,
        opponents: new Set(p.opponents ?? []),
      }));

      const shuffleResult = engineGenerateTables(engineParticipants);
      const tableGroups = shuffleResult.tables;
      updateOpponents(tableGroups);

      const tableNumberMap = new Map<string, number>();
      const opponentsMap = new Map<string, string[]>();
      tableGroups.forEach((group, i) => {
        group.forEach((p) => {
          tableNumberMap.set(p.id, i + 1);
          opponentsMap.set(p.id, Array.from(p.opponents));
        });
      });

      const updated = participantsWithCurrentHistory.map((p) => {
        if (p.status !== 'active') return p;
        const tableNum = tableNumberMap.get(p.id);
        if (tableNum !== undefined) {
          return {
            ...p,
            tableNumber: tableNum,
            opponents: opponentsMap.get(p.id) ?? p.opponents,
          };
        }
        // Outside semifinal cutoff → eliminated at last regular phase
        return { ...p, status: 'eliminated' as const, tableNumber: undefined, eliminatedAtPhase: Math.max(1, tournamentState.semifinalPhase - 1) };
      });

      setParticipants(updated);
      return { warnings: shuffleResult.warnings };
    }

    // Phases 1–4 → regular reshuffle. Unpaid/inactive players stay on the roster
    // but are excluded from pairing.
    const allActive = participantsWithCurrentHistory
      .filter((p) => p.status === 'active')
      .sort((a, b) => b.score - a.score);

    const engineParticipants: EngineParticipant[] = allActive.map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      score: p.score,
      opponents: new Set(p.opponents ?? []),
    }));
    let tableGroups: EngineParticipant[][];
    let warnings: string[] = [];

    try {
      const shuffleResult = engineGenerateTables(engineParticipants);
      tableGroups = shuffleResult.tables;
      warnings = shuffleResult.warnings;
    } catch {
      const pool = [...engineParticipants].sort(() => Math.random() - 0.5);
      tableGroups = [];
      for (let i = 0; i < pool.length; i += 5) tableGroups.push(pool.slice(i, i + 5));
      warnings = ['Mesin pairing utama gagal; sistem memakai fallback acak dan tetap menyimpan riwayat lawan.'];
    }
    updateOpponents(tableGroups);

    const tableNumberMap = new Map<string, number>();
    const opponentsMap = new Map<string, string[]>();
    tableGroups.forEach((group, i) => {
      group.forEach((p) => {
        if (p.isDummy) return;
        tableNumberMap.set(p.id, i + 1);
        opponentsMap.set(p.id, Array.from(p.opponents));
      });
    });

    const updated = participantsWithCurrentHistory.map((p) => {
      if (p.status !== 'active') return p;
      return {
        ...p,
        tableNumber: tableNumberMap.get(p.id) ?? p.tableNumber,
        opponents: opponentsMap.get(p.id) ?? p.opponents,
      };
    });

    setParticipants(updated);
    return { warnings };
  }, [finalCutoff, participants, phaseScores, semifinalCutoff, shuffleTargetPhase, tournamentState.finalPhase, tournamentState.semifinalPhase]);

  // Mark generated phase as active.
  const handlePhaseComplete = useCallback((targetPhase: number) => {
    setTournamentState((prev) => {
      const next = {
        ...prev,
        phase: targetPhase,
        status: 'in_progress' as TournamentState['status'],
        isFinalPhase: targetPhase >= prev.finalPhase,
      };
      persistTournamentState(next);
      return next;
    });
  }, [persistTournamentState]);

  // Go back to previous phase
  const handlePhaseBack = useCallback(() => {
    setTournamentState((prev) => {
      const newPhase = Math.max(1, prev.phase - 1);
      const next = {
        ...prev,
        phase: newPhase,
        status: 'waiting' as TournamentState['status'],
        isFinalPhase: false,
      };
      persistTournamentState(next);
      return next;
    });
    // Restore players that were eliminated at or after the phase we're going back to
    setParticipants((prev) => {
      const newPhase = Math.max(1, tournamentState.phase - 1);
      return prev.map((p) => {
        if (p.status === 'eliminated' && (p.eliminatedAtPhase ?? 0) >= newPhase) {
          const { eliminatedAtPhase: _, ...rest } = p;
          return { ...rest, status: 'active' as const, tableNumber: undefined };
        }
        return p;
      });
    });
    setShowPhaseBackWarning(false);
  }, [persistTournamentState, tournamentState.phase]);

  // Reset all scores (set all participant scores to 0)
  const handleResetAllScores = useCallback(async () => {
    setParticipants((prev) =>
      prev.map((p) => ({ ...p, score: 0, matchesPlayed: 0 }))
    );
    setPhaseScores({});
    // Clear phase scores via API
    await fetch('/api/player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetScores: true }),
    }).catch(console.error);
    updateTournamentStats();
    setShowResetAllScoresWarning(false);
  }, [updateTournamentStats]);

  const handleLogout = useCallback(async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.replace('/admin/login');
  }, [router]);

  const handleExportPairings = useCallback(() => {
    window.location.href = '/api/admin/tables/export';
  }, []);

  const handleSemifinalCutoffChange = useCallback((cutoff: 10 | 20) => {
    setSemifinalCutoff(cutoff);
    setTournamentState((prev) => {
      const next = { ...prev, semifinalCutoff: cutoff };
      persistTournamentState(next, cutoff, finalCutoff);
      return next;
    });
  }, [finalCutoff, persistTournamentState]);

  const handleFinalCutoffChange = useCallback((cutoff: 5 | 10) => {
    setFinalCutoff(cutoff);
    setTournamentState((prev) => {
      const next = { ...prev, finalCutoff: cutoff };
      persistTournamentState(next, semifinalCutoff, cutoff);
      return next;
    });
  }, [persistTournamentState, semifinalCutoff]);

  const handlePhaseConfigChange = useCallback((
    maxPhases: number,
    semifinalPhase: number,
    finalPhase: number,
  ) => {
    const safeMax = Math.max(2, Math.floor(maxPhases));
    const safeFinal = Math.min(safeMax, Math.max(2, Math.floor(finalPhase)));
    const safeSemifinal = Math.min(safeFinal - 1, Math.max(1, Math.floor(semifinalPhase)));
    setTournamentState((prev) => {
      const next: TournamentState = {
        ...prev,
        maxPhases: safeMax,
        semifinalPhase: safeSemifinal,
        finalPhase: safeFinal,
        phase: Math.min(prev.phase, safeMax),
        isFinalPhase: prev.phase >= safeFinal,
      };
      persistTournamentState(next);
      return next;
    });
    toast.success('Konfigurasi babak tersimpan', {
      description: `Total ${safeMax} babak · Semifinal di Babak ${safeSemifinal} · Final di Babak ${safeFinal}.`,
    });
  }, [persistTournamentState]);

  const handleResetDatabase = useCallback(async () => {
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resetDatabase' }),
    });

    if (!response.ok) {
      toast.error('Failed to reset database');
      return;
    }

    const data = await response.json();
    setParticipants(data.participants);
    setTournamentState(data.tournamentState);
    setSemifinalCutoff(data.tournamentState.semifinalCutoff ?? 20);
    setFinalCutoff(data.tournamentState.finalCutoff ?? 10);
    setPhaseScores({});
    setShowResetWarning(false);

    await fetch('/api/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([]),
    }).catch(console.error);

    toast.success('Database reset');
  }, []);

  const handleDeleteParticipants = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    const response = await fetch('/api/admin/player', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      toast.error('Failed to delete participants', {
        description: `${ids.length} participant${ids.length === 1 ? '' : 's'} could not be deleted.`,
      });
      return;
    }

    const payload = (await response.json().catch(() => null)) as
      | { deleted?: number }
      | null;
    const deletedCount = typeof payload?.deleted === 'number' ? payload.deleted : ids.length;

    const deletedIds = new Set(ids);
    const nextParticipants = participants.filter((p) => !deletedIds.has(p.id));
    const activeCount = nextParticipants.filter((p) => p.status === 'active').length;
    setParticipants(nextParticipants);
    setTournamentState((prev) => ({
      ...prev,
      totalParticipants: activeCount,
      totalTables: Math.ceil(activeCount / 5),
    }));
    toast.success(
      deletedCount === 1 ? 'Participant deleted' : `${deletedCount} participants deleted`
    );
  }, [participants]);

  const handleDeleteParticipant = useCallback(async (id: string) => {
    await handleDeleteParticipants([id]);
  }, [handleDeleteParticipants]);

  const handleArchiveParticipants = useCallback(async (ids: string[], archived: boolean) => {
    if (ids.length === 0) return;
    const selectedIds = new Set(ids);
    const nextParticipants = participants.map((p) =>
      selectedIds.has(p.id)
        ? {
            ...p,
            status: archived ? 'archived' as const : 'active' as const,
            tableNumber: archived ? undefined : p.tableNumber,
          }
        : p
    );
    const activeCount = nextParticipants.filter((p) => p.status === 'active').length;
    setParticipants(nextParticipants);
    setTournamentState((prev) => ({
      ...prev,
      totalParticipants: activeCount,
      totalTables: Math.ceil(activeCount / 5),
    }));
    toast.success(
      archived
        ? `${selectedIds.size} participant${selectedIds.size === 1 ? '' : 's'} archived`
        : `${selectedIds.size} participant${selectedIds.size === 1 ? '' : 's'} restored`
    );
  }, [participants]);

  const handleArchiveParticipant = useCallback(async (id: string, archived: boolean) => {
    await handleArchiveParticipants([id], archived);
  }, [handleArchiveParticipants]);

  // Toggle participant active status (registration fee paid)
  const handleToggleActive = useCallback(async (id: string, active: boolean) => {
    const nextParticipants = participants.map((p) =>
        p.id === id ? { ...p, status: active ? 'active' as const : 'inactive' as const } : p
      );
    const activeCount = nextParticipants.filter((p) => p.status === 'active').length;
    setParticipants(nextParticipants);
    setTournamentState((prev) => ({
      ...prev,
      totalParticipants: activeCount,
      totalTables: Math.ceil(activeCount / 5),
    }));
  }, [participants]);

  // Save scores from table scoring with phase tracking
  const handleSaveScores = useCallback(async (updates: { id: string; score: number; phase: number }[]) => {
    const phaseUpdates = updates.map((u) => {
      const participant = participants.find((p) => p.id === u.id);
      
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

    // 2. Update cumulative scores in admin state only for regular phases.
    // Semifinal and final points stay phase-specific in phaseScores.
    setParticipants((prev) =>
      prev.map((p) => {
        const update = updates.find((u) => u.id === p.id);
        if (!update) return p;
        const isRegularPhase = update.phase < tournamentState.semifinalPhase;
        
        // Calculate the change from previous score for this phase
        const previousScore = phaseScores[update.id]?.[update.phase];
        const scoreChange = update.score - (previousScore ?? 0);
        
        return {
          ...p,
          score: isRegularPhase ? p.score + scoreChange : p.score,
          matchesPlayed: previousScore === undefined ? p.matchesPlayed + 1 : p.matchesPlayed,
        };
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
  }, [participants, phaseScores, tournamentState.semifinalPhase, updateTournamentStats]);

  // Sync participants to player store and push tables to display whenever participants change.
  // Skipped for the initial DB load (syncEnabled is false at that point).
  useEffect(() => {
    if (!syncEnabled.current) return;
    lastLocalMutationAt.current = Date.now();
    const sync = async () => {
      const tables = buildTablesFromParticipants(
        participants,
        phaseScores,
        tournamentState.phase,
        tournamentState.semifinalPhase
      );
      const fetches: Promise<unknown>[] = [
        fetch('/api/player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participants }),
        }).catch(console.error),
      ];
      fetches.push(
        fetch('/api/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tables),
        }).catch(console.error)
      );
      await Promise.all(fetches);
    };
    sync();
  }, [participants, phaseScores, tournamentState.phase, tournamentState.semifinalPhase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-[#0B0F1A] overflow-y-auto">
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
      
      {/* Mobile Header — centered logo + name, kebab menu for actions */}
      <header className="sm:hidden sticky top-0 z-40 border-b border-white/10 bg-[#0B0F1A]/90 backdrop-blur-sm">
        <div className="relative h-14 px-3 flex items-center justify-center">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/LOGO.png" alt="Remi 13 Logo" className="w-8 h-8 rounded-xl object-contain shrink-0" />
            <span className="text-base font-bold text-white truncate">Remi 13 Admin</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-zinc-900 text-zinc-300 hover:text-white active:bg-white/10"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {mobileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="absolute right-3 top-full mt-2 z-50 w-64 bg-zinc-900 border border-white/10 rounded-xl shadow-xl shadow-black/40 p-2 space-y-1">
                <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg bg-zinc-800/60">
                  <span className="text-[11px] uppercase tracking-wider text-zinc-500">Babak</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setShowPhaseBackWarning(true);
                      }}
                      disabled={tournamentState.phase === 1}
                      aria-label="Previous babak"
                      className="inline-flex w-8 h-8 items-center justify-center rounded-md border border-white/10 text-white disabled:opacity-30 hover:bg-white/10"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-bold text-white tabular-nums">
                      {tournamentState.phase} <span className="text-zinc-500">/ {tournamentState.maxPhases}</span>
                    </span>
                  </div>
                </div>
                <MobileMenuItem
                  icon={QrCode}
                  label="Player QR"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowQRCode(true);
                  }}
                />
                <MobileMenuItem
                  icon={Download}
                  label="Export Excel"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleExportPairings();
                  }}
                />
                <MobileMenuItem
                  icon={RotateCcw}
                  label="Reset DB"
                  tone="amber"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowResetWarning(true);
                  }}
                />
                <MobileMenuItem
                  icon={Trash2}
                  label="Reset all scores"
                  tone="red"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowResetAllScoresWarning(true);
                  }}
                />
                <MobileMenuItem
                  icon={LogOut}
                  label="Logout"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                />
              </div>
            </>
          )}
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden sm:block border-b border-white/10 bg-[#0B0F1A]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 min-w-0"
            >
              <img src="/LOGO.png" alt="Remi 13 Logo" className="w-10 h-10 rounded-xl object-contain shrink-0" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-white truncate">Remi 13 Admin</h1>
                <p className="text-sm text-zinc-500">Tournament Control Panel</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <Button variant="outline" size="sm" onClick={handleLogout} className="border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowResetWarning(true)} className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset DB
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowQRCode(true)} className="border-white/10 text-white hover:bg-white/10">
                <QrCode className="w-4 h-4 mr-2" />
                Player QR
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPairings} className="border-white/10 text-white hover:bg-white/10">
                <Download className="w-4 h-4 mr-2" />
                Export Excel
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
                  <p className="text-sm text-zinc-500">Babak</p>
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

      {/* Desktop Navigation Tabs */}
      <div className="hidden sm:block max-w-7xl mx-auto px-6 lg:px-8 py-4">
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
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 sm:pb-6">
        <div className="pb-6">
          {activeTab === 'participants' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column - Controls */}
              <div className="lg:col-span-4 space-y-6">
                <PhaseStatus
                  state={tournamentState}
                  semifinalCutoff={semifinalCutoff}
                  finalCutoff={finalCutoff}
                />
                <ShuffleControl
                  state={tournamentState}
                  targetPhase={shuffleTargetPhase}
                  semifinalCutoff={semifinalCutoff}
                  finalCutoff={finalCutoff}
                  scoredSeatedCount={seatedActiveScoredCount}
                  totalSeatedCount={seatedActiveParticipants.length}
                  onSemifinalCutoffChange={handleSemifinalCutoffChange}
                  onFinalCutoffChange={handleFinalCutoffChange}
                  onShuffle={handleShuffle}
                  onPhaseComplete={handlePhaseComplete}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddParticipant(true)}
                    className="group flex items-center gap-3 p-4 rounded-xl bg-zinc-900/50 border border-white/10 hover:border-emerald-500/40 hover:bg-zinc-800/60 active:scale-[0.99] transition text-left"
                  >
                    <div className="w-10 h-10 shrink-0 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/25">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">Add Participant</p>
                      <p className="text-xs text-zinc-500">Create a single participant</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBulkImport(true)}
                    className="group flex items-center gap-3 p-4 rounded-xl bg-zinc-900/50 border border-white/10 hover:border-cyan-500/40 hover:bg-zinc-800/60 active:scale-[0.99] transition text-left"
                  >
                    <div className="w-10 h-10 shrink-0 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-500/25">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">Bulk Import</p>
                      <p className="text-xs text-zinc-500">Upload Excel / CSV</p>
                    </div>
                  </button>
                  <div className="sm:col-span-2">
                    <PhaseConfig
                      maxPhases={tournamentState.maxPhases}
                      semifinalPhase={tournamentState.semifinalPhase}
                      finalPhase={tournamentState.finalPhase}
                      currentPhase={tournamentState.phase}
                      onChange={handlePhaseConfigChange}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Participants Table */}
              <div className="lg:col-span-8">
                <ParticipantTable
                  participants={participants}
                  teams={teams}
                  onDelete={handleDeleteParticipant}
                  onDeleteMany={handleDeleteParticipants}
                  onArchive={handleArchiveParticipant}
                  onArchiveMany={handleArchiveParticipants}
                  onToggleActive={handleToggleActive}
                />
              </div>
            </div>
          ) : (
            <TableScoring
              currentPhase={tournamentState.phase}
              phaseScores={phaseScores}
              accumulatesScores={tournamentState.phase < tournamentState.semifinalPhase}
              onSaveScores={handleSaveScores}
            />
          )}
        </div>
      </main>

      {/* Add Participant Dialog */}
      <Dialog open={showAddParticipant} onOpenChange={setShowAddParticipant}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-500" />
              Add Participant
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Create a single participant entry.
            </DialogDescription>
          </DialogHeader>
          <ParticipantForm
            bare
            onAddParticipant={async (name, team) => {
              await handleAddParticipant(name, team);
              setShowAddParticipant(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-purple-500" />
              Bulk Import
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Upload a CSV or XLSX file with columns: name, team.
            </DialogDescription>
          </DialogHeader>
          <BulkImportUploader
            bare
            existingParticipants={participants}
            onImport={async (parts) => {
              await handleBulkImport(parts);
              setShowBulkImport(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <PlayerQRCode 
        isOpen={showQRCode} 
        onClose={() => setShowQRCode(false)} 
        tables={buildTablesFromParticipants(
          participants,
          phaseScores,
          tournamentState.phase,
          tournamentState.semifinalPhase
        )}
      />

      {/* Phase Back Warning Dialog */}
      <Dialog open={showPhaseBackWarning} onOpenChange={setShowPhaseBackWarning}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              Go Back to Previous Babak?
            </DialogTitle>
            <DialogDescription className="text-zinc-400 pt-2">
              You are about to go back from Babak {tournamentState.phase} to Babak {tournamentState.phase - 1}.
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

      <Dialog open={showResetWarning} onOpenChange={setShowResetWarning}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              Reset Database Data?
            </DialogTitle>
            <DialogDescription className="text-zinc-400 pt-2">
              This will replace all current participant records in the database with the latest seeded list,
              reset all scores and match history, clear table assignments, and return the tournament to phase 1.
              <br /><br />
              <span className="text-amber-400 font-bold">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowResetWarning(false)}
              className="flex-1 border-white/10 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetDatabase}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Database
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

      {/* Mobile floating bottom tab bar */}
      <div
        className="sm:hidden fixed inset-x-0 z-50 px-4 pointer-events-none"
        style={{ bottom: `max(0.75rem, env(safe-area-inset-bottom))` }}
      >
        <div className="mx-auto w-fit pointer-events-auto flex items-center gap-1 p-1 rounded-full bg-zinc-900/90 backdrop-blur border border-white/10 shadow-lg shadow-black/40">
          {[
            { id: 'participants' as TabType, label: 'Participants', icon: Users },
            { id: 'scoring' as TabType, label: 'Scoring', icon: Calculator },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-label={item.label}
                className={`flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white text-black'
                    : 'text-zinc-300 hover:text-white active:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
