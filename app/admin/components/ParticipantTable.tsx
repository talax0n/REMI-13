'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Users, ChevronUp, ChevronDown, Trash2, Edit2, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Archive, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { AdminParticipant } from '../types';
import { getTeamColor } from '../../components/team-style';

interface ParticipantTableProps {
  participants: AdminParticipant[];
  teams: string[];
  isLoading?: boolean;
  onDelete?: (id: string) => Promise<void>;
  onDeleteMany?: (ids: string[]) => Promise<void>;
  onArchive?: (id: string, archived: boolean) => Promise<void>;
  onArchiveMany?: (ids: string[], archived: boolean) => Promise<void>;
  onEdit?: (participant: AdminParticipant) => void;
  onToggleActive?: (id: string, active: boolean) => Promise<void>;
}

type SortField = 'name' | 'team' | 'score' | 'matchesPlayed' | 'status';
type SortDirection = 'asc' | 'desc';

function getTeamStyle(team: string) {
  return getTeamColor(team);
}

// Stats Card Component
function StatsCard({ 
  title, 
  count, 
  icon: Icon, 
  colorClass 
}: { 
  title: string; 
  count: number; 
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <div className="bg-zinc-800/50 rounded-lg p-2.5 sm:p-4 border border-white/5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider truncate">{title}</p>
          <p className={`text-lg sm:text-2xl font-bold tabular-nums ${colorClass}`}>{count}</p>
        </div>
        <Icon className={`w-6 h-6 sm:w-8 sm:h-8 shrink-0 ${colorClass} opacity-50`} />
      </div>
    </div>
  );
}

export default function ParticipantTable({
  participants,
  teams,
  isLoading = false,
  onDelete,
  onDeleteMany,
  onArchive,
  onArchiveMany,
  onEdit,
  onToggleActive,
}: ParticipantTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  // Calculate stats
  const stats = useMemo(() => {
    const active = participants.filter(p => p.status === 'active').length;
    const archived = participants.filter(p => p.status === 'archived').length;
    const inactive = participants.filter(p => p.status !== 'active' && p.status !== 'archived').length;
    return { active, inactive, archived, total: participants.length };
  }, [participants]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredParticipants = useMemo(() => {
    let result = [...participants];

    // Filter by search
    if (searchQuery) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by team
    if (teamFilter && teamFilter !== 'all') {
      result = result.filter((p) => p.team === teamFilter);
    }

    // Filter by status
    if (statusFilter && statusFilter !== 'all') {
      result = result.filter((p) => {
        if (statusFilter === 'active') return p.status === 'active';
        if (statusFilter === 'archived') return p.status === 'archived';
        return p.status !== 'active' && p.status !== 'archived';
      });
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'team':
          comparison = a.team.localeCompare(b.team);
          break;
        case 'score':
          comparison = a.score - b.score;
          break;
        case 'matchesPlayed':
          comparison = a.matchesPlayed - b.matchesPlayed;
          break;
        case 'status':
          comparison = (a.status === 'active' ? 1 : 0) - (b.status === 'active' ? 1 : 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [participants, searchQuery, teamFilter, statusFilter, sortField, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(filteredParticipants.length / pageSize);
  const safeCurrentPage = Math.min(currentPage, Math.max(totalPages, 1));
  const paginatedParticipants = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredParticipants.slice(start, end);
  }, [filteredParticipants, safeCurrentPage, pageSize]);
  const selectedParticipants = useMemo(
    () => participants.filter((participant) => selectedIds.has(participant.id)),
    [participants, selectedIds]
  );
  const visibleSelectableIds = useMemo(
    () => paginatedParticipants.map((participant) => participant.id),
    [paginatedParticipants]
  );
  const allVisibleSelected = visibleSelectableIds.length > 0
    && visibleSelectableIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleSelectableIds.some((id) => selectedIds.has(id));

  useEffect(() => {
    setSelectedIds((prev) => {
      const existingIds = new Set(participants.map((participant) => participant.id));
      const next = new Set(Array.from(prev).filter((id) => existingIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [participants]);

  const toggleSelected = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleVisibleSelected = (selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleSelectableIds.forEach((id) => {
        if (selected) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const runBulkAction = async (action: () => Promise<void>) => {
    setIsBulkActionLoading(true);
    try {
      await action();
      setSelectedIds(new Set());
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 ml-1" />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
    >
      <Card className="bg-zinc-900/50 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="w-5 h-5 text-cyan-500" />
            Participants
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
              {filteredParticipants.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <StatsCard
              title="Total"
              count={stats.total}
              icon={Users}
              colorClass="text-blue-400"
            />
            <StatsCard
              title="Active (Paid)"
              count={stats.active}
              icon={CheckCircle2}
              colorClass="text-emerald-400"
            />
            <StatsCard
              title="Inactive"
              count={stats.inactive}
              icon={XCircle}
              colorClass="text-rose-400"
            />
          </div>
          {stats.archived > 0 && (
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-white/5 flex items-center justify-between">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Archived</span>
              <span className="text-sm font-bold text-zinc-300">{stats.archived}</span>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-500"
              />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Filter className="w-4 h-4 text-zinc-500 shrink-0" />
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="flex-1 sm:w-[140px] sm:flex-none bg-zinc-800/50 border-white/10 text-white">
                  <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-white/10">
                  <SelectItem value="all" className="text-white hover:bg-zinc-700">
                    All Teams
                  </SelectItem>
                  {teams.map((c) => (
                    <SelectItem
                      key={c}
                      value={c}
                      className="text-white hover:bg-zinc-700"
                    >
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 sm:w-[140px] sm:flex-none bg-zinc-800/50 border-white/10 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-white/10">
                  <SelectItem value="all" className="text-white hover:bg-zinc-700">
                    All Status
                  </SelectItem>
                  <SelectItem value="active" className="text-white hover:bg-zinc-700">
                    Active (Paid)
                  </SelectItem>
                  <SelectItem value="inactive" className="text-white hover:bg-zinc-700">
                    Inactive (Unpaid)
                  </SelectItem>
                  <SelectItem value="archived" className="text-white hover:bg-zinc-700">
                    Archived
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedParticipants.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3">
              <div>
                <p className="text-sm font-medium text-cyan-100">
                  {selectedParticipants.length} selected
                </p>
                <p className="text-xs text-cyan-300/70">
                  Bulk actions apply to selected participants across all pages.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {onArchiveMany && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBulkActionLoading}
                      onClick={() => runBulkAction(() => onArchiveMany(Array.from(selectedIds), true))}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBulkActionLoading}
                      onClick={() => runBulkAction(() => onArchiveMany(Array.from(selectedIds), false))}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore
                    </Button>
                  </>
                )}
                {onDeleteMany && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBulkActionLoading}
                    onClick={() => runBulkAction(() => onDeleteMany(Array.from(selectedIds)))}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isBulkActionLoading}
                  onClick={() => setSelectedIds(new Set())}
                  className="text-zinc-400 hover:text-white"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="border border-white/10 rounded-lg overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader className="bg-zinc-800">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="w-10 text-center">
                    <input
                      type="checkbox"
                      aria-label="Select visible participants"
                      checked={allVisibleSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = !allVisibleSelected && someVisibleSelected;
                      }}
                      onChange={(e) => toggleVisibleSelected(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-zinc-900 accent-cyan-500"
                    />
                  </TableHead>
                  <TableHead
                    className="text-zinc-300 cursor-pointer hover:text-white"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Name
                      {renderSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-zinc-300 cursor-pointer hover:text-white"
                    onClick={() => handleSort('team')}
                  >
                    <div className="flex items-center">
                      Team
                      {renderSortIcon('team')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-zinc-300 cursor-pointer hover:text-white text-right"
                    onClick={() => handleSort('score')}
                  >
                    <div className="flex items-center justify-end">
                      Score
                      {renderSortIcon('score')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-zinc-300 cursor-pointer hover:text-white text-right"
                    onClick={() => handleSort('matchesPlayed')}
                  >
                    <div className="flex items-center justify-end">
                      Matches
                      {renderSortIcon('matchesPlayed')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-zinc-300 cursor-pointer hover:text-white text-center"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center justify-center">
                      Paid
                      {renderSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead className="text-zinc-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-white/5">
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedParticipants.length === 0 ? (
                  <TableRow className="border-white/5">
                    <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                      No participants found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedParticipants.map((participant) => {
                    const teamStyle = getTeamStyle(participant.team);
                    const isActive = participant.status === 'active';
                    const isArchived = participant.status === 'archived';
                    return (
                      <TableRow
                        key={participant.id}
                        className={`border-white/5 hover:bg-white/[0.02] ${isArchived ? 'opacity-50' : ''}`}
                      >
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            aria-label={`Select ${participant.name}`}
                            checked={selectedIds.has(participant.id)}
                            onChange={(e) => toggleSelected(participant.id, e.target.checked)}
                            className="h-4 w-4 rounded border-white/20 bg-zinc-900 accent-cyan-500"
                          />
                        </TableCell>
                        <TableCell className="font-medium text-white">
                          {participant.name}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${teamStyle.bg} ${teamStyle.text}`}
                          >
                            {participant.team}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-white">
                          {participant.score.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-zinc-400">
                          {participant.matchesPlayed}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={isActive}
                              disabled={isArchived}
                              onCheckedChange={(checked: boolean) => 
                                onToggleActive?.(participant.id, checked)
                              }
                              className="data-[state=checked]:bg-emerald-500"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {onEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(participant)}
                                className="h-8 w-8 text-zinc-400 hover:text-white"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            )}
                            {onDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(participant.id)}
                                className="h-8 w-8 text-zinc-400 hover:text-red-400"
                                title="Delete participant"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                            {onArchive && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onArchive(participant.id, !isArchived)}
                                className="h-8 w-8 text-zinc-400 hover:text-cyan-400"
                                title={isArchived ? 'Restore participant' : 'Archive participant'}
                              >
                                {isArchived ? (
                                  <RotateCcw className="w-4 h-4" />
                                ) : (
                                  <Archive className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
            {/* Page size selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">Show</span>
              <Select value={pageSize.toString()} onValueChange={(v) => {
                setPageSize(parseInt(v));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-[80px] bg-zinc-800/50 border-white/10 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-white/10">
                  {[10, 25, 50, 100].map((size) => (
                    <SelectItem
                      key={size}
                      value={size.toString()}
                      className="text-white hover:bg-zinc-700"
                    >
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-zinc-500">entries</span>
            </div>

            {/* Page info */}
            <div className="text-sm text-zinc-400">
              Showing {((safeCurrentPage - 1) * pageSize) + 1} to {Math.min(safeCurrentPage * pageSize, filteredParticipants.length)} of {filteredParticipants.length} entries
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="border-white/10 text-white hover:bg-white/10 disabled:opacity-50 h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show pages around current page
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (safeCurrentPage <= 3) {
                    pageNum = i + 1;
                  } else if (safeCurrentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = safeCurrentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={safeCurrentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`
                        h-8 w-8 p-0 text-sm font-medium
                        ${safeCurrentPage === pageNum 
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-0' 
                          : 'border-white/10 text-white hover:bg-white/10'
                        }
                      `}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages || totalPages === 0}
                className="border-white/10 text-white hover:bg-white/10 disabled:opacity-50 h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
