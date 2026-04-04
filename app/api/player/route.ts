import {
  getPlayerScores,
  getPlayerByNameAndChurch,
  syncFromAdminParticipants,
  updatePlayerPhaseScore,
} from '@/lib/player-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const church = searchParams.get('church');

  if (name && church) {
    const player = getPlayerByNameAndChurch(name, church);
    if (player) {
      const allPlayers = getPlayerScores().sort((a, b) => b.totalScore - a.totalScore);
      const rank = allPlayers.findIndex((p) => p.id === player.id) + 1;
      return Response.json({ ...player, rank });
    }
    return Response.json({ error: 'Player not found' }, { status: 404 });
  }

  return Response.json(getPlayerScores());
}

export async function POST(request: Request) {
  const body = await request.json();

  // Sync full participant list from admin
  if (body.participants) {
    syncFromAdminParticipants(body.participants);
    return Response.json({ ok: true, count: body.participants.length });
  }

  // Record per-phase scores from admin table scoring
  if (body.phaseUpdates) {
    const updates: { id: string; phase: number; points: number; tableNumber?: number }[] =
      body.phaseUpdates;
    updates.forEach(({ id, phase, points, tableNumber }) => {
      updatePlayerPhaseScore(id, phase, points, tableNumber);
    });
    return Response.json({ ok: true, count: updates.length });
  }

  return Response.json({ error: 'Invalid request' }, { status: 400 });
}
