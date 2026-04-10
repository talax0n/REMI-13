import {
  getPlayerScores,
  getPlayerByNameAndChurch,
  syncFromAdminParticipants,
  resetAllPlayerScores,
  updatePlayerPhaseScore,
} from '@/lib/player-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const church = searchParams.get('church');

  if (name && church) {
    const player = await getPlayerByNameAndChurch(name, church);
    if (player) {
      const allPlayers = (await getPlayerScores()).sort((a, b) => b.totalScore - a.totalScore);
      const rank = allPlayers.findIndex((p) => p.id === player.id) + 1;
      return Response.json({ ...player, rank });
    }
    return Response.json({ error: 'Player not found' }, { status: 404 });
  }

  return Response.json(await getPlayerScores());
}

export async function POST(request: Request) {
  const body = await request.json();

  if (body.participants) {
    await syncFromAdminParticipants(body.participants);
    return Response.json({ ok: true, count: body.participants.length });
  }

  if (body.phaseUpdates) {
    const updates: { id: string; phase: number; points: number; tableNumber?: number }[] =
      body.phaseUpdates;
    await Promise.all(
      updates.map(({ id, phase, points, tableNumber }) =>
        updatePlayerPhaseScore(id, phase, points, tableNumber)
      )
    );
    return Response.json({ ok: true, count: updates.length });
  }

  if (body.resetScores) {
    await resetAllPlayerScores();
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Invalid request' }, { status: 400 });
}
