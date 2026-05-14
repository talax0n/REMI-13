export interface PhaseScore {
  points: number;
  tableNumber?: number;
  timestamp: string;
}

export interface PlayerScore {
  id: string;
  name: string;
  team: string;
  scores: Record<number, PhaseScore>; // phase number -> score
  totalScore: number;
  status: 'active' | 'inactive' | 'eliminated' | 'winner' | 'archived';
  currentPhase?: number;
  currentTable?: number;
  rank?: number;
}

export type PlayerView = 'login' | 'loading' | 'profile' | 'not-found';

export interface LoginFormData {
  name: string;
  team: string;
}
