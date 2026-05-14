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
import { toast } from 'sonner';

interface ShuffleControlProps {
  state: TournamentState;
  targetPhase: number;
  semifinalCutoff: 10 | 20;
  finalCutoff: 5 | 10;
  onSemifinalCutoffChange: (cutoff: 10 | 20) => void;
  onFinalCutoffChange: (cutoff: 5 | 10) => void;
  onShuffle: () => Promise<{ warnings: string[] }>;
  onPhaseComplete: (targetPhase: number) => void;
}

export default function ShuffleControl({
  state,
  targetPhase,
  semifinalCutoff,
  finalCutoff,
  onSemifinalCutoffChange,
  onFinalCutoffChange,
  onShuffle,
  onPhaseComplete,
}: ShuffleControlProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

  const canShuffle = state.phase < state.maxPhases && state.totalParticipants >= 1;
  const isPhaseComplete = state.status === 'completed';

  const handleShuffleClick = () => {
    if (!canShuffle) {
      if (state.phase >= state.maxPhases) {
        toast.error('Turnamen selesai', {
          description: 'Semua fase telah selesai.',
        });
      } else if (state.totalParticipants < 1) {
        toast.error('Peserta tidak cukup', {
          description: 'Butuh minimal 1 peserta aktif untuk generate meja.',
        });
      }
      return;
    }
    setIsDialogOpen(true);
  };

  const handleConfirmShuffle = async () => {
    setIsDialogOpen(false);
    setIsShuffling(true);
    
    toast.loading('Generating tables...', { id: 'shuffle' });
    
    try {
      const result = await onShuffle();
      const label =
        targetPhase === 5 ? `Semifinal (Top ${semifinalCutoff})` :
        targetPhase === 6 ? `Final (Top ${finalCutoff})` :
        `Fase ${targetPhase}`;
      toast.success('Meja berhasil dibuat', {
        id: 'shuffle',
        description: `Meja untuk ${label} sudah siap.`,
      });
      result.warnings.forEach((warning) => {
        toast.warning('Catatan pairing', { description: warning });
      });
      onPhaseComplete(targetPhase);
    } catch (error) {
      toast.error('Gagal membuat meja', {
        id: 'shuffle',
        description: error instanceof Error ? error.message : 'Silakan coba lagi.',
      });
    } finally {
      setIsShuffling(false);
    }
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
              {targetPhase === 5
                ? `Akan memilih ${semifinalCutoff} pemain teratas untuk Semifinal (Fase 5).`
                : targetPhase === 6
                ? `Akan memilih ${finalCutoff} pemain teratas untuk Final (Fase 6).`
                : `Akan men-shuffle meja untuk Fase ${targetPhase}.`}
            </DialogDescription>
          </DialogHeader>

          {targetPhase === 5 && (
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

          {targetPhase === 6 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-300">Final cutoff</p>
              <div className="grid grid-cols-2 gap-2">
                {[5, 10].map((cutoff) => (
                  <Button
                    key={cutoff}
                    type="button"
                    variant={finalCutoff === cutoff ? 'default' : 'outline'}
                    onClick={() => onFinalCutoffChange(cutoff as 5 | 10)}
                    className={finalCutoff === cutoff ? 'bg-blue-600 hover:bg-blue-500' : 'border-white/20 text-white hover:bg-white/10'}
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
              {targetPhase === 5
                ? `Pemain di luar Top ${semifinalCutoff} akan dieliminasi.`
                : targetPhase === 6
                ? `Pemain di luar Top ${finalCutoff} akan dieliminasi.`
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
    </motion.div>
  );
}
