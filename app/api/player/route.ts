import { getPlayerScores, getPlayerByNameAndChurch, syncFromAdminParticipants } from '@/lib/player-store';
import { PlayerScore } from '@/app/player/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const church = searchParams.get('church');
  
  if (name && church) {
    // Search for specific player
    const player = getPlayerByNameAndChurch(name, church);
    if (player) {
      // Add rank information
      const allPlayers = getPlayerScores().sort((a, b) => b.totalScore - a.totalScore);
      const rank = allPlayers.findIndex(p => p.id === player.id) + 1;
      return Response.json({ ...player, rank });
    }
    return Response.json({ error: 'Player not found' }, { status: 404 });
  }
  
  // Return all scores (for leaderboard)
  const scores = getPlayerScores();
  return Response.json(scores);
}

export async function POST(request: Request) {
  const body = await request.json();
  
  // Sync from admin participants
  if (body.participants) {
    syncFromAdminParticipants(body.participants);
    return Response.json({ ok: true, count: body.participants.length });
  }
  
  return Response.json({ error: 'Invalid request' }, { status: 400 });
}
