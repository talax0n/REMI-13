'use client';

import { useEffect, useState } from 'react';
import { Settings2, Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PhaseConfigProps {
  maxPhases: number;
  semifinalPhase: number;
  finalPhase: number;
  currentPhase: number;
  onChange: (maxPhases: number, semifinalPhase: number, finalPhase: number) => void;
}

export default function PhaseConfig({
  maxPhases,
  semifinalPhase,
  finalPhase,
  currentPhase,
  onChange,
}: PhaseConfigProps) {
  const [open, setOpen] = useState(false);
  const [maxInput, setMaxInput] = useState(maxPhases);
  const [semiInput, setSemiInput] = useState(semifinalPhase);
  const [finalInput, setFinalInput] = useState(finalPhase);

  useEffect(() => {
    setMaxInput(maxPhases);
    setSemiInput(semifinalPhase);
    setFinalInput(finalPhase);
  }, [maxPhases, semifinalPhase, finalPhase]);

  const regularPhases = Math.max(0, semiInput - 1);
  const validationError =
    !Number.isFinite(maxInput) || maxInput < 2
      ? 'Total fase minimal 2.'
      : !Number.isFinite(finalInput) || finalInput < 2 || finalInput > maxInput
        ? `Fase Final harus antara 2 dan ${maxInput}.`
        : !Number.isFinite(semiInput) || semiInput < 1 || semiInput >= finalInput
          ? `Fase Semifinal harus antara 1 dan ${finalInput - 1}.`
          : null;

  const isDirty =
    maxInput !== maxPhases || semiInput !== semifinalPhase || finalInput !== finalPhase;
  const currentPhaseConflict = currentPhase > maxInput;

  const handleSave = () => {
    if (validationError) return;
    onChange(maxInput, semiInput, finalInput);
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setMaxInput(maxPhases);
      setSemiInput(semifinalPhase);
      setFinalInput(finalPhase);
    }
    setOpen(next);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex items-center gap-3 p-4 rounded-xl bg-zinc-900/50 border border-white/10 hover:border-purple-500/40 hover:bg-zinc-800/60 active:scale-[0.99] transition text-left w-full"
      >
        <div className="w-10 h-10 shrink-0 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center group-hover:bg-purple-500/25">
          <Settings2 className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Phase Configuration</p>
          <p className="text-xs text-zinc-500 truncate">
            {maxPhases} fase · Semifinal F{semifinalPhase} · Final F{finalPhase}
          </p>
        </div>
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-purple-400" />
              Phase Configuration
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Atur total fase turnamen serta fase mana yang jadi Semifinal dan Final.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-zinc-500">
                  Total Fase
                </label>
                <Input
                  type="number"
                  min={2}
                  value={Number.isFinite(maxInput) ? maxInput : ''}
                  onChange={(e) => setMaxInput(parseInt(e.target.value, 10))}
                  className="bg-zinc-800/50 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-zinc-500">
                  Fase Semifinal
                </label>
                <Input
                  type="number"
                  min={1}
                  value={Number.isFinite(semiInput) ? semiInput : ''}
                  onChange={(e) => setSemiInput(parseInt(e.target.value, 10))}
                  className="bg-zinc-800/50 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-zinc-500">
                  Fase Final
                </label>
                <Input
                  type="number"
                  min={2}
                  value={Number.isFinite(finalInput) ? finalInput : ''}
                  onChange={(e) => setFinalInput(parseInt(e.target.value, 10))}
                  className="bg-zinc-800/50 border-white/10 text-white"
                />
              </div>
            </div>

            <div className="rounded-lg border border-white/5 bg-zinc-800/40 p-3 text-xs text-zinc-400">
              <p>
                <span className="text-zinc-300 font-medium">{regularPhases}</span> fase reguler ·{' '}
                <span className="text-zinc-300 font-medium">Fase {Number.isFinite(semiInput) ? semiInput : '?'}</span> Semifinal ·{' '}
                <span className="text-zinc-300 font-medium">Fase {Number.isFinite(finalInput) ? finalInput : '?'}</span> Final
              </p>
              <p className="mt-1 text-zinc-500">
                Cutoff Top-N untuk Semifinal/Final diatur di kartu Table Generation.
              </p>
            </div>

            {validationError && (
              <Alert className="bg-red-500/10 border-red-500/30 text-red-300">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="text-red-200">{validationError}</AlertDescription>
              </Alert>
            )}

            {!validationError && currentPhaseConflict && (
              <Alert className="bg-yellow-500/10 border-yellow-500/30 text-yellow-300">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="text-yellow-200">
                  Fase saat ini ({currentPhase}) melebihi total fase baru. Fase akan diatur ulang ke {maxInput}.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || !!validationError}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
