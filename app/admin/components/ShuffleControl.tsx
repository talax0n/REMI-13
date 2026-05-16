'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, AlertTriangle, Loader2, Users, Table2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TournamentState } from '../types';
import type { ShuffleOptions, ShuffleResult, ShuffleTiebreakInfo } from '../page';
import { toast } from 'sonner';

interface ShuffleControlProps {
  state: TournamentState;
  targetPhase: number;
  semifinalCutoff: 10 | 20;
  scoredSeatedCount: number;
  totalSeatedCount: number;
  onSemifinalCutoffChange: (cutoff: 10 | 20) => void;
  onShuffle: (opts?: ShuffleOptions) => Promise<ShuffleResult>;
  onPhaseComplete: (targetPhase: number) => void;
}

export default function ShuffleControl({
  state,
  targetPhase,
  semifinalCutoff,
  scoredSeatedCount,
  totalSeatedCount,
  onSemifinalCutoffChange,
  onShuffle,
  onPhaseComplete,
}: ShuffleControlProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isPartialScoreAlertOpen, setIsPartialScoreAlertOpen] = useState(false);
  const [partialScoreAcknowledged, setPartialScoreAcknowledged] = useState(false);
  const [tiebreak, setTiebreak] = useState<ShuffleTiebreakInfo | null>(null);
  const [tiebreakSelected, setTiebreakSelected] = useState<Set<string>>(new Set());
  // Final flow can surface multiple ties sequentially (one per semifinal table + wildcard slot).
  // Accumulate picks across rounds so already-resolved ties are not re-prompted.
  const [resolvedTiebreakers, setResolvedTiebreakers] = useState<Record<string, string[]>>({});

  const hasPartialScores =
    totalSeatedCount > 0
    && scoredSeatedCount > 0
    && scoredSeatedCount < totalSeatedCount;
  const missingScoreCount = Math.max(totalSeatedCount - scoredSeatedCount, 0);

  const canShuffle = state.phase < state.maxPhases && state.totalParticipants >= 1;
  const isPhaseComplete = state.status === 'completed';

  const handleShuffleClick = () => {
    if (!canShuffle) {
      if (state.phase >= state.maxPhases) {
        toast.error('Turnamen selesai', {
          description: 'Semua babak telah selesai.',
        });
      } else if (state.totalParticipants < 1) {
        toast.error('Peserta tidak cukup', {
          description: 'Butuh minimal 1 peserta aktif untuk generate meja.',
        });
      }
      return;
    }
    if (hasPartialScores) {
      setPartialScoreAcknowledged(false);
      setIsPartialScoreAlertOpen(true);
      return;
    }
    setIsDialogOpen(true);
  };

  const handlePartialScoreContinue = () => {
    setIsPartialScoreAlertOpen(false);
    setIsDialogOpen(true);
  };

  const finishShuffle = (warnings: string[]) => {
    const label =
      targetPhase === state.semifinalPhase ? `Semifinal (Top ${semifinalCutoff})` :
      targetPhase === state.finalPhase ? 'Final (Top 10: 8 meja + 2 wildcard)' :
      `Babak ${targetPhase}`;
    toast.success('Meja berhasil dibuat', {
      id: 'shuffle',
      description: `Meja untuk ${label} sudah siap.`,
    });
    warnings.forEach((warning) => {
      toast.warning('Catatan pairing', { description: warning });
    });
    onPhaseComplete(targetPhase);
  };

  const runShuffle = async (resolved: Record<string, string[]>) => {
    toast.loading('Generating tables...', { id: 'shuffle' });
    setIsShuffling(true);
    try {
      const result = await onShuffle({ resolvedTiebreakers: resolved });
      if (result.tiebreak) {
        toast.dismiss('shuffle');
        setTiebreakSelected(new Set());
        setTiebreak(result.tiebreak);
        return;
      }
      setResolvedTiebreakers({});
      finishShuffle(result.warnings);
    } catch (error) {
      toast.error('Gagal membuat meja', {
        id: 'shuffle',
        description: error instanceof Error ? error.message : 'Silakan coba lagi.',
      });
    } finally {
      setIsShuffling(false);
    }
  };

  const handleConfirmShuffle = async () => {
    setIsDialogOpen(false);
    setResolvedTiebreakers({});
    await runShuffle({});
  };

  const handleConfirmTiebreak = async () => {
    if (!tiebreak) return;
    if (tiebreakSelected.size !== tiebreak.slotsRemaining) return;
    const merged = { ...resolvedTiebreakers, [tiebreak.phaseLabel]: Array.from(tiebreakSelected) };
    setResolvedTiebreakers(merged);
    setTiebreak(null);
    await runShuffle(merged);
  };

  const toggleTiebreakPick = (id: string) => {
    if (!tiebreak) return;
    setTiebreakSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= tiebreak.slotsRemaining) return prev;
      next.add(id);
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="bg-zinc-900/50 border-white/10 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white">
            <Shuffle className="w-5 h-5 text-blue-500" />
            Table Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Summary */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg">
              <Users className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-300">{state.totalParticipants}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg">
              <Table2 className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-300">{state.totalTables} tables</span>
            </div>
          </div>

          {/* Warning Messages */}
          {!canShuffle && (
            <Alert className="bg-red-500/10 border-red-500/30 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                {state.phase >= state.maxPhases 
                  ? 'Tournament is complete. No more phases available.'
                  : 'No active paid participants to generate tables.'}
              </AlertDescription>
            </Alert>
          )}

          {isPhaseComplete && canShuffle && (
            <Alert className="bg-yellow-500/10 border-yellow-500/30 text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Current phase is complete. Ready to shuffle for next phase.
              </AlertDescription>
            </Alert>
          )}

          {canShuffle && hasPartialScores && (
            <Alert className="bg-red-500/10 border-red-500/30 text-red-300">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-red-200">
                {scoredSeatedCount} dari {totalSeatedCount} pemain sudah punya skor untuk Babak {state.phase}.
                Generate ulang sekarang akan membuang skor tersebut. Lengkapi skor {missingScoreCount} pemain lain dulu untuk lanjut ke babak berikutnya.
              </AlertDescription>
            </Alert>
          )}

          {/* Primary Action Button */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isShuffling ? 'loading' : 'idle'}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                onClick={handleShuffleClick}
                disabled={!canShuffle || isShuffling}
                className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
              >
                {isShuffling ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating Tables...
                  </>
                ) : (
                  <>
                    <Shuffle className="w-5 h-5 mr-2" />
                    Generate / Shuffle Tables
                  </>
                )}
              </Button>
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Konfirmasi Generate Meja
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {targetPhase === state.semifinalPhase
                ? `Akan memilih ${semifinalCutoff} pemain teratas untuk Semifinal (Babak ${state.semifinalPhase}).`
                : targetPhase === state.finalPhase
                ? `Akan memilih 10 finalis untuk Final (Babak ${state.finalPhase}): Top 2 dari setiap meja semifinal (8) + 2 wildcard berdasarkan skor semifinal tertinggi dari sisa pemain.`
                : `Akan men-shuffle meja untuk Babak ${targetPhase}.`}
            </DialogDescription>
          </DialogHeader>

          {targetPhase === state.semifinalPhase && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-300">Semifinal cutoff</p>
              <div className="grid grid-cols-2 gap-2">
                {[10, 20].map((cutoff) => (
                  <Button
                    key={cutoff}
                    type="button"
                    variant={semifinalCutoff === cutoff ? 'default' : 'outline'}
                    onClick={() => onSemifinalCutoffChange(cutoff as 10 | 20)}
                    className={semifinalCutoff === cutoff ? 'bg-blue-600 hover:bg-blue-500' : 'border-white/20 text-white hover:bg-white/10'}
                  >
                    Top {cutoff}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 my-4">
            <p className="text-sm text-yellow-400">
              <strong>Peringatan:</strong>{' '}
              {targetPhase === state.semifinalPhase
                ? `Pemain di luar Top ${semifinalCutoff} akan dieliminasi.`
                : targetPhase === state.finalPhase
                ? 'Pemain di luar 10 finalis akan dieliminasi.'
                : 'Semua penugasan meja saat ini akan diganti.'}
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmShuffle}
              className="bg-blue-600 hover:bg-blue-500"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Confirm Shuffle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPartialScoreAlertOpen} onOpenChange={(open) => {
        setIsPartialScoreAlertOpen(open);
        if (!open) setPartialScoreAcknowledged(false);
      }}>
        <DialogContent className="bg-zinc-900 border-red-500/40 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-300">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Skor Belum Lengkap
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Sebagian pemain sudah punya skor untuk Babak {state.phase}, tapi belum semua.
              Men-generate ulang sekarang akan menyusun ulang meja dan membuang skor yang sudah masuk.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-zinc-800/40 p-3 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Sudah skor</p>
                <p className="text-xl font-bold text-emerald-400 tabular-nums">{scoredSeatedCount}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Belum skor</p>
                <p className="text-xl font-bold text-red-400 tabular-nums">{missingScoreCount}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Total seated</p>
                <p className="text-xl font-bold text-white tabular-nums">{totalSeatedCount}</p>
              </div>
            </div>

            <Alert className="bg-red-500/10 border-red-500/30 text-red-300">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-red-200">
                <span className="font-semibold">{scoredSeatedCount} skor</span> yang sudah diinput akan hilang.
                Untuk maju ke babak berikutnya, lengkapi skor {missingScoreCount} pemain yang belum diinput.
              </AlertDescription>
            </Alert>

            <label className="flex items-start gap-2 rounded-lg border border-white/10 bg-zinc-800/40 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={partialScoreAcknowledged}
                onChange={(e) => setPartialScoreAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-zinc-900 accent-red-500"
              />
              <span className="text-sm text-zinc-300">
                Saya mengerti dan tetap ingin menyusun ulang meja sekarang. Skor yang sudah masuk akan dibuang.
              </span>
            </label>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPartialScoreAlertOpen(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Kembali, lengkapi skor
            </Button>
            <Button
              onClick={handlePartialScoreContinue}
              disabled={!partialScoreAcknowledged}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Lanjut Shuffle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={tiebreak !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTiebreak(null);
            setTiebreakSelected(new Set());
            setResolvedTiebreakers({});
            toast.dismiss('shuffle');
          }
        }}
      >
        <DialogContent className="bg-zinc-900 border-yellow-500/40 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Pilih pemain untuk {tiebreak?.phaseLabel}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {tiebreak ? (
                <>
                  {tiebreak.guaranteedCount} pemain otomatis lolos. Tersisa{' '}
                  <span className="font-semibold text-yellow-300">{tiebreak.slotsRemaining} slot</span>{' '}
                  untuk {tiebreak.candidates.length} pemain dengan skor sama
                  (<span className="font-semibold">{tiebreak.tiedScore}</span>). Pilih yang lolos.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          {tiebreak && (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {tiebreak.candidates.map((c) => {
                const checked = tiebreakSelected.has(c.id);
                const disabled = !checked && tiebreakSelected.size >= tiebreak.slotsRemaining;
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      checked
                        ? 'border-yellow-500/60 bg-yellow-500/10'
                        : disabled
                          ? 'border-white/5 bg-zinc-800/30 opacity-50 cursor-not-allowed'
                          : 'border-white/10 bg-zinc-800/40 hover:bg-zinc-800/70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleTiebreakPick(c.id)}
                      className="h-4 w-4 rounded border-white/20 bg-zinc-900 accent-yellow-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.name}</p>
                      <p className="text-xs text-zinc-400 truncate">{c.team}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-yellow-300 tabular-nums">{c.score}</p>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                        {c.matchesPlayed} match
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-800/40 px-3 py-2">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Terpilih</span>
            <span className="text-sm font-semibold tabular-nums">
              {tiebreakSelected.size} / {tiebreak?.slotsRemaining ?? 0}
            </span>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setTiebreak(null);
                setTiebreakSelected(new Set());
                setResolvedTiebreakers({});
                toast.dismiss('shuffle');
              }}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmTiebreak}
              disabled={!tiebreak || tiebreakSelected.size !== tiebreak.slotsRemaining}
              className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950"
            >
              Lanjut Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
