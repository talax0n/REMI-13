'use client';

import { motion } from 'framer-motion';
import { Trophy, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TournamentState } from '../types';

interface PhaseStatusProps {
  state: TournamentState;
}

const phaseLabels: Record<number, string> = {
  1: 'Fase Reguler 1',
  2: 'Fase Reguler 2',
  3: 'Fase Reguler 3',
  4: 'Fase Reguler 4',
  5: 'Semifinal (Top 20)',
  6: 'Final (Top 10)',
};

const statusConfig = {
  waiting: {
    icon: Clock,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Waiting',
  },
  in_progress: {
    icon: AlertCircle,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    label: 'In Progress',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    label: 'Completed',
  },
};

export default function PhaseStatus({ state }: PhaseStatusProps) {
  const StatusIcon = statusConfig[state.status].icon;
  const progress = (state.phase / state.maxPhases) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-zinc-900/50 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Tournament Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Phase */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">Current Phase</p>
              <p className="text-2xl font-bold text-white">
                Phase {state.phase} 
                <span className="text-base font-normal text-zinc-400 ml-2">
                  {phaseLabels[state.phase]}
                </span>
              </p>
            </div>
            <Badge 
              className={`${statusConfig[state.status].bgColor} ${statusConfig[state.status].color} border-0`}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig[state.status].label}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Progress</span>
              <span className="text-zinc-400">{state.phase} / {state.maxPhases}</span>
            </div>
            <Progress 
              value={progress} 
              className="h-2 bg-zinc-800"
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="text-sm text-zinc-500">Participants</p>
              <p className="text-xl font-bold text-white">{state.totalParticipants}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="text-sm text-zinc-500">Active Tables</p>
              <p className="text-xl font-bold text-white">{state.totalTables}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
