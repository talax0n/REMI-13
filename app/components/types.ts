export interface Player {
  id: string;
  name: string;
  church: string;
  score: number;
  rank: number;
  previousRank?: number;
  status?: 'active' | 'eliminated' | 'winner';
  currentTable?: number;
}

export interface Table {
  id: string;
  number: number;
  players: Player[];
}

export type ScreenType = 'leaderboard' | 'tables';
