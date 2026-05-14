export interface Player {
  id: string;
  name: string;
  team: string;
  score: number;
  rank: number;
  previousRank?: number;
  status?: 'active' | 'eliminated' | 'winner' | 'dummy' | 'archived';
  isDummy?: boolean;
  currentTable?: number;
  currentPhaseScore?: number;
}

export interface Table {
  id: string;
  number: number;
  players: Player[];
}

export type ScreenType = 'leaderboard' | 'tables';
