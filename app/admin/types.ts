export interface AdminParticipant {
  id: string;
  name: string;
  church: string;
  score: number;
  matchesPlayed: number;
  tableNumber?: number;
  status: 'active' | 'eliminated' | 'winner';
}

export interface TournamentState {
  phase: number;
  status: 'waiting' | 'in_progress' | 'completed';
  totalParticipants: number;
  totalTables: number;
  maxPhases: number;
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
