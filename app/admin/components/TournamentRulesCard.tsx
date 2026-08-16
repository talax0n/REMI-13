'use client';

import { Crown, Layers3, Table2, Users } from 'lucide-react';
import { REMI13_RULES } from '@/lib/tournament-config';

export default function TournamentRulesCard() {
  const rules = [
    { icon: Users, label: 'Peserta', value: `±${REMI13_RULES.targetParticipants}` },
    { icon: Table2, label: 'Isi meja', value: `${REMI13_RULES.tableSize} orang` },
    { icon: Layers3, label: 'Format', value: `${REMI13_RULES.totalPhases} × ${REMI13_RULES.shufflesPerPhase}` },
    { icon: Crown, label: 'Pemenang', value: `Top ${REMI13_RULES.individualWinners}` },
  ];

  return (
    <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Format kompetisi</p>
          <p className="text-xs text-cyan-200/60">Aturan Remi 13 yang sedang aktif</p>
        </div>
        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
          Fixed rules
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {rules.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-lg border border-white/[0.06] bg-zinc-950/30 p-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
              <Icon className="h-3 w-3 text-cyan-300" />
              {label}
            </div>
            <p className="text-sm font-bold text-white">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-zinc-400">
        Semua peserta bermain sampai Babak 5. Nilai setiap babak adalah akumulasi dari 6 kocokan;
        juara individu ditentukan dari total nilai 5 babak, dan juara umum dari total nilai per team.
      </p>
    </section>
  );
}
