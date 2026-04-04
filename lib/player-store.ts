import { PlayerScore, PhaseScore } from '@/app/player/types';

let playerScores: PlayerScore[] = [];
const MAX_PHASES = 5;

const subscribers = new Set<(players: PlayerScore[]) => void>();

function notify(): void {
  const snapshot = [...playerScores];
  subscribers.forEach((fn) => {
    try {
      fn(snapshot);
    } catch {
      subscribers.delete(fn);
    }
  });
}

export function subscribeToPlayers(fn: (players: PlayerScore[]) => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function getPlayerScores(): PlayerScore[] {
  return playerScores;
}

export function getLeaderboard(): PlayerScore[] {
  return [...playerScores]
    .filter((p) => p.status !== 'eliminated')
    .sort((a, b) => b.totalScore - a.totalScore);
}

export function getPlayerByNameAndChurch(name: string, church: string): PlayerScore | null {
  return (
    playerScores.find(
      (p) =>
        p.name.toLowerCase() === name.toLowerCase() &&
        p.church.toLowerCase() === church.toLowerCase()
    ) || null
  );
}

// Record the score earned in a specific phase (for player detail history view).
// totalScore is intentionally NOT touched here — it is owned by syncFromAdminParticipants
// which always reflects the authoritative cumulative score from the admin panel.
export function updatePlayerPhaseScore(
  playerId: string,
  phase: number,
  points: number,
  tableNumber?: number
): void {
  const player = playerScores.find((p) => p.id === playerId);
  if (!player) return;

  player.scores[phase] = {
    points,
    tableNumber,
    timestamp: new Date().toISOString(),
  };
  notify();
}

export function syncFromAdminParticipants(
  adminParticipants: Array<{
    id: string;
    name: string;
    church: string;
    score: number;
    status: string;
    tableNumber?: number;
  }>
): void {
  adminParticipants.forEach((ap) => {
    if (ap.status !== 'active' && ap.status !== 'winner') return;

    const existing = playerScores.find((p) => p.id === ap.id);
    if (existing) {
      existing.name = ap.name;
      existing.church = ap.church;
      existing.status = ap.status as PlayerScore['status'];
      existing.currentTable = ap.tableNumber;
      // ap.score is the authoritative cumulative score from the admin panel —
      // always sync it so the leaderboard reflects the latest scored total.
      existing.totalScore = ap.score;
    } else {
      playerScores.push({
        id: ap.id,
        name: ap.name,
        church: ap.church,
        status: ap.status as PlayerScore['status'],
        scores: {},
        totalScore: ap.score,
        currentTable: ap.tableNumber,
      });
    }
  });
  notify();
}

export { MAX_PHASES };
