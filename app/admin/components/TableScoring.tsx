'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Save, RotateCcw, Trophy, ArrowLeft, Hash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AdminParticipant } from '../types';
import { churchColors, defaultChurchColor } from '../../components/participants';

interface TableScoringProps {
  participants: AdminParticipant[];
  onSaveScores: (updates: { id: string; score: number }[]) => Promise<void>;
}

interface TableData {
  number: number;
  participants: AdminParticipant[];
}

function getChurchStyle(church: string) {
  return churchColors[church] || defaultChurchColor;
}

export default function TableScoring({ participants, onSaveScores }: TableScoringProps) {
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Group participants by table
  const tables = useMemo(() => {
    const activeParticipants = participants.filter(p => p.status === 'active');
    const tableMap: Record<number, AdminParticipant[]> = {};
    
    activeParticipants.forEach(p => {
      const tableNum = p.tableNumber || 1;
      if (!tableMap[tableNum]) tableMap[tableNum] = [];
      tableMap[tableNum].push(p);
    });

    return Object.entries(tableMap)
      .map(([num, parts]) => ({ number: parseInt(num), participants: parts }))
      .sort((a, b) => a.number - b.number);
  }, [participants]);

  // Get current table data
  const currentTable = useMemo(() => {
    if (!selectedTable) return null;
    return tables.find(t => t.number === selectedTable) || null;
  }, [selectedTable, tables]);

  const handleScoreChange = (participantId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setScores(prev => ({ ...prev, [participantId]: numValue }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      toast.info('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      const updates = Object.entries(scores).map(([id, score]) => ({ id, score }));
      await onSaveScores(updates);
      toast.success('Scores saved successfully');
      setHasChanges(false);
      setScores({});
    } catch (error) {
      toast.error('Failed to save scores');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setScores({});
    setHasChanges(false);
    toast.info('Scores reset');
  };

  const handleBackToTables = () => {
    if (hasChanges) {
      toast.warning('You have unsaved changes!', {
        action: {
          label: 'Save',
          onClick: handleSave,
        },
      });
    }
    setSelectedTable(null);
  };

  // Calculate table stats
  const getTableStats = (table: TableData) => {
    const hasScores = table.participants.some(p => scores[p.id] !== undefined);
    const scoredCount = table.participants.filter(p => scores[p.id] !== undefined).length;
    return { hasScores, scoredCount };
  };

  if (tables.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-zinc-900/50 border-white/10">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Hash className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Tables Available</h3>
            <p className="text-zinc-500">Generate tables first to start scoring</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Table Grid View
  if (!selectedTable) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-xl font-bold text-white">Table Scoring</h2>
            <p className="text-sm text-zinc-500">Tap a table to input scores</p>
          </div>
          <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-0">
            {tables.length} Tables
          </Badge>
        </div>

        {/* Table Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {tables.map((table, index) => {
            const stats = getTableStats(table);
            return (
              <motion.button
                key={table.number}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelectedTable(table.number)}
                className={`
                  relative group p-4 rounded-2xl border-2 transition-all duration-200
                  ${stats.hasScores 
                    ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50' 
                    : 'bg-zinc-900/50 border-white/10 hover:border-white/20 hover:bg-zinc-800/50'
                  }
                `}
              >
                {/* Table Number */}
                <div className="flex items-center justify-between mb-3">
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold
                    ${stats.hasScores 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700'
                    }
                  `}>
                    {table.number}
                  </div>
                  {stats.hasScores && (
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>{table.participants.length} players</span>
                  </div>
                  {stats.hasScores && (
                    <div className="text-xs text-emerald-400 font-medium">
                      {stats.scoredCount}/{table.participants.length} scored
                    </div>
                  )}
                </div>

                {/* Hover arrow */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-xs text-white">→</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Tables</p>
            <p className="text-xl font-bold text-white">{tables.length}</p>
          </div>
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Active Players</p>
            <p className="text-xl font-bold text-emerald-400">
              {participants.filter(p => p.status === 'active').length}
            </p>
          </div>
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Scored Today</p>
            <p className="text-xl font-bold text-blue-400">
              {Object.keys(scores).length}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Participant Scoring View
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      {/* Navigation Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackToTables}
          className="border-white/10 text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">Table {currentTable?.number}</h2>
          <p className="text-sm text-zinc-500">{currentTable?.participants.length} participants</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!hasChanges}
            className="border-white/10 text-white hover:bg-white/10 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Participants List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {currentTable?.participants.map((participant, index) => {
            const churchStyle = getChurchStyle(participant.church);
            const currentScore = scores[participant.id] ?? participant.score;
            const hasNewScore = scores[participant.id] !== undefined;
            
            return (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  bg-zinc-900/50 border rounded-2xl p-4 transition-colors
                  ${hasNewScore ? 'border-emerald-500/30' : 'border-white/10'}
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Seat Number & Avatar */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-lg font-bold text-zinc-400">
                      {index + 1}
                    </div>
                    {index === 0 && hasNewScore && (
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white truncate">
                        {participant.name}
                      </h3>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${churchStyle.bg} ${churchStyle.text}`}>
                      {participant.church}
                    </span>
                    
                    {/* Current Score */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Current:</span>
                      <span className="text-sm font-mono text-zinc-400">
                        {participant.score.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Score Input Section */}
                  <div className="flex flex-col items-end gap-2">
                    {/* Input */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">+</span>
                      <Input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={scores[participant.id] ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          handleScoreChange(participant.id, e.target.value)
                        }
                        placeholder="0"
                        className="
                          w-20 h-10 bg-zinc-800/50 border-white/10 
                          text-white text-lg font-bold text-center
                          focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20
                          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                        "
                      />
                    </div>
                    
                    {/* Total Preview */}
                    <div className="text-right">
                      <span className="text-xs text-zinc-500">= </span>
                      <span className={`
                        text-lg font-black tabular-nums
                        ${hasNewScore ? 'text-emerald-400' : 'text-zinc-400'}
                      `}>
                        {(participant.score + (scores[participant.id] || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Bottom Actions - Mobile Friendly */}
      <div className="sticky bottom-4 pt-4">
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-white/10 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">
                {hasChanges ? 'Unsaved changes' : 'All changes saved'}
              </p>
              <p className="text-xs text-zinc-500">
                {Object.keys(scores).length} scores entered
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={handleBackToTables}
                className="border-white/10 text-white hover:bg-white/10"
              >
                Done
              </Button>
              <Button
                size="lg"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Scores'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
