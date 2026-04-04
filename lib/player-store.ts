import { PlayerScore, PhaseScore } from '@/app/player/types';

// In-memory store for player scores with phases
let playerScores: PlayerScore[] = [];
const MAX_PHASES = 5;

// Initialize with sample data
export function initializePlayerScores() {
  // This will be populated from the admin system
  // For now, it's empty and will be filled as admin enters scores
  playerScores = [];
}

export function getPlayerScores(): PlayerScore[] {
  return playerScores;
}

export function getPlayerByNameAndChurch(name: string, church: string): PlayerScore | null {
  return playerScores.find(
    p => p.name.toLowerCase() === name.toLowerCase() && 
         p.church.toLowerCase() === church.toLowerCase()
  ) || null;
}

export function updatePlayerScore(
  playerId: string, 
  phase: number, 
  points: number,
  tableNumber?: number
): void {
  const player = playerScores.find(p => p.id === playerId);
  
  if (player) {
    player.scores[phase] = {
      points,
      tableNumber,
      timestamp: new Date().toISOString(),
    };
    // Recalculate total
    player.totalScore = Object.values(player.scores).reduce((sum, s: PhaseScore) => sum + s.points, 0);
  }
}

export function addOrUpdatePlayer(player: PlayerScore): void {
  const existingIndex = playerScores.findIndex(p => p.id === player.id);
  
  if (existingIndex >= 0) {
    playerScores[existingIndex] = { ...playerScores[existingIndex], ...player };
  } else {
    playerScores.push(player);
  }
}

export function syncFromAdminParticipants(adminParticipants: Array<{
  id: string;
  name: string;
  church: string;
  score: number;
  status: string;
  tableNumber?: number;
}>): void {
  // Convert admin participants to player scores format
  adminParticipants.forEach(adminParticipant => {
    if (adminParticipant.status === 'active' || adminParticipant.status === 'winner') {
      const existing = playerScores.find(p => p.id === adminParticipant.id);
      
      if (existing) {
        // Update existing player
        existing.name = adminParticipant.name;
        existing.church = adminParticipant.church;
        existing.status = adminParticipant.status as 'active' | 'eliminated' | 'winner';
      } else {
        // Create new player with empty phase scores
        playerScores.push({
          id: adminParticipant.id,
          name: adminParticipant.name,
          church: adminParticipant.church,
          status: adminParticipant.status as 'active' | 'eliminated' | 'winner',
          scores: {},
          totalScore: adminParticipant.score,
        });
      }
    }
  });
}

export function getLeaderboard(): PlayerScore[] {
  return [...playerScores]
    .filter(p => p.status !== 'eliminated')
    .sort((a, b) => b.totalScore - a.totalScore);
}

export { MAX_PHASES };
