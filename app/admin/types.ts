export interface AdminParticipant {
  id: string;
  name: string;
  team: string;
  score: number;
  matchesPlayed: number;
  tableNumber?: number;
  opponents?: string[];
  status: 'active' | 'inactive' | 'eliminated' | 'winner' | 'dummy' | 'archived';
  eliminatedAtPhase?: number;
}

export interface TournamentState {
  phase: number;
  status: 'waiting' | 'in_progress' | 'completed';
  totalParticipants: number;
  totalTables: number;
  maxPhases: number;
  semifinalPhase: number;
  finalPhase: number;
  isFinalPhase: boolean;
  semifinalCutoff: 10 | 20;
  finalCutoff: 5 | 10;
  finalWildcardIds?: string[];
  finalTableA?: number[]; // Player ranks: 1, 3, 5, 7, 9
  finalTableB?: number[]; // Player ranks: 2, 4, 6, 8, 10
}

export interface Table {
  id: string;
  number: number;
  participants: AdminParticipant[];
}

export type ImportStatus = 'idle' | 'validating' | 'preview' | 'importing' | 'success' | 'error';

export interface ImportValidation {
  valid: boolean;
  errors: string[];
  duplicates: string[];
  missingFields: string[];
}

export interface ParticipantImportRow {
  name: string;
  team: string;
  status: 'active' | 'inactive';
  statusRaw?: string;
}
